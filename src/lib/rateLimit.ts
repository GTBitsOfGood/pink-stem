import RateLimitWindowDAO from "@/db/actions/rateLimitWindow";
import { TooManyRequestsError } from "@/types/exceptions";

/**
 * Fixed-window limiter held in MongoDB, so limits hold across serverless
 * instances and restarts.
 */
export async function assertRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<void> {
  const { count, expiresAt } = await RateLimitWindowDAO.hit(key, windowMs);
  if (count > limit) {
    throw new TooManyRequestsError(
      undefined,
      Math.max(1, expiresAt.getTime() - Date.now()),
      count === limit + 1
    );
  }
}
