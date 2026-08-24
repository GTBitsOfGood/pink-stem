import { NextRequest } from "next/server";

/**
 * Builds no-store headers for responses that must never be cached by the
 * browser or an edge proxy.
 */
export function cacheControlMiddleware(req: NextRequest) {
  const newHeaders = new Headers(req.headers);
  newHeaders.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  newHeaders.set("Pragma", "no-cache");
  newHeaders.set("Expires", "0");

  return newHeaders;
}
