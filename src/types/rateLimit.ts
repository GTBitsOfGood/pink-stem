/** One fixed rate-limit window: hits on `key` until `expiresAt`. */
export interface RateLimitWindow {
  key: string;
  count: number;
  expiresAt: Date;
}
