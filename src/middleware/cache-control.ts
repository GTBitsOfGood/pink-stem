/**
 * Builds no-store headers for responses that must never be cached by the
 * browser or an edge proxy.
 *
 * Headers are constructed fresh rather than copied from the request. Cloning
 * request headers would reflect Cookie and Authorization back as response
 * headers, where any intermediary cache or access log would capture them.
 */
export function cacheControlMiddleware(): Headers {
  const headers = new Headers();
  headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");

  return headers;
}
