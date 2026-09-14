import { HTTPError } from "@/types/exceptions";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const BASE_URL = "/api/v1";

/** Drops empty filter values so cache keys and query strings stay stable. */
export function compactFilters(
  filters: Record<string, string | undefined>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      (entry): entry is [string, string] => !!entry[1]
    )
  );
}

/** Turns a filters object into a query string, skipping empty values. */
export function toQuery(
  params: Record<string, string | number | boolean | undefined>
): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== ""
  );
  return entries.length
    ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}`
    : "";
}

/**
 * Single entry point for every call the frontend makes to the backend API.
 * Sends the session cookie, JSON-encodes bodies, and converts non-2xx
 * responses into `HTTPError` so hooks can branch on status and code.
 */
export default async function fetchHTTPClient<T>(
  endpoint: string,
  method: HttpMethod = "GET",
  body?: unknown
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      credentials: "include",
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new HTTPError(
      "We could not reach the server. Check your connection and try again.",
      503
    );
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let code: string | undefined;
    try {
      const payload = (await response.json()) as {
        error?: string;
        code?: string;
      };
      message = payload.error ?? message;
      code = payload.code;
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    throw new HTTPError(message, response.status, code);
  }

  if (response.status === 204) {
    return null as T;
  }
  return response.json();
}
