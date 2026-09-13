import { TooManyRequestsError } from "@/types/exceptions";

interface Bucket {
  hits: number[];
}

declare global {
  var rateLimitBuckets: Map<string, Bucket> | undefined;
}

/**
 * Sliding-window limiter held in process memory. Adequate for a single
 * server; swap the Map for a shared store if the app is ever scaled out.
 */
const buckets = globalThis.rateLimitBuckets ?? new Map<string, Bucket>();
globalThis.rateLimitBuckets = buckets;

export function assertRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): void {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((at) => now - at < windowMs);

  if (bucket.hits.length >= limit) {
    throw new TooManyRequestsError();
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  // Keep the map from growing without bound.
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      if (b.hits.every((at) => now - at >= windowMs)) buckets.delete(k);
    }
  }
}
