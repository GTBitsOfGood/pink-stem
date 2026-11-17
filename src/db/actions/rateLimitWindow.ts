import dbConnect from "@/db/dbConnect";
import { ensureIndexes } from "@/db/defineModel";
import RateLimitWindowModel from "@/db/models/rateLimitWindow";
import type { RateLimitWindow } from "@/types/rateLimit";

export default class RateLimitWindowDAO {
  /**
   * Counts one hit on `key` atomically, opening a new window once the last
   * has expired. A missing expiresAt sorts below any date, so a new key opens
   * one too.
   */
  static async hit(key: string, windowMs: number): Promise<RateLimitWindow> {
    await dbConnect();
    // Concurrent first hits share one window only once the unique index exists.
    await ensureIndexes(RateLimitWindowModel);
    const now = new Date();
    const stale = { $lte: ["$expiresAt", now] };
    return RateLimitWindowModel.findOneAndUpdate(
      { key },
      [
        {
          $set: {
            count: { $cond: [stale, 1, { $add: ["$count", 1] }] },
            expiresAt: {
              $cond: [stale, new Date(now.getTime() + windowMs), "$expiresAt"],
            },
          },
        },
      ],
      { upsert: true, returnDocument: "after", updatePipeline: true }
    )
      .lean<RateLimitWindow>()
      .orFail();
  }
}
