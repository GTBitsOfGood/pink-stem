import dbConnect from "@/db/dbConnect";
import RateLimitWindowModel from "@/db/models/rateLimitWindow";
import { TooManyRequestsError } from "@/types/exceptions";

// Headroom past the window's own length before we let the TTL reaper
// clean up the document. Purely disk hygiene, not correctness.
const TTL_BUFFER_MS = 60_000;

/**
 * Fixed-window limiter backed by Mongo, so limits hold across Netlify
 * function instances and survive restarts. One atomic findOneAndUpdate
 * per call: resets the window if stale, otherwise increments in place.
 */
export async function assertRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<void> {
  await dbConnect();
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);

  const doc = await RateLimitWindowModel.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          _stale: {
            $or: [
              { $eq: ["$windowStart", null] },
              { $lte: ["$windowStart", cutoff] },
            ],
          },
        },
      },
      {
        $set: {
          windowStart: { $cond: ["$_stale", now, "$windowStart"] },
          count: { $cond: ["$_stale", 1, { $add: ["$count", 1] }] },
          expiresAt: {
            $add: [
              { $cond: ["$_stale", now, "$windowStart"] },
              windowMs + TTL_BUFFER_MS,
            ],
          },
        },
      },
      { $unset: "_stale" },
    ],
    { upsert: true, new: true, updatePipeline: true }
  );

  if (doc.count > limit) {
    const retryAfterMs = doc.windowStart.getTime() + windowMs - now.getTime();
    throw new TooManyRequestsError(
      undefined,
      retryAfterMs > 0 ? retryAfterMs : 0,
      doc.count,
      limit
    );
  }
}
