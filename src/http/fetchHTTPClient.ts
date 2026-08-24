import { HTTPError } from "@/types/exceptions";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const BASE_URL = "/api/v1";

/**
 * Verifies the fetch parameters based on the method type, following MDN
 * semantics for which methods carry a body.
 * @param method HTTP method of request
 * @param request Request information
 */
function verifyFetchRequest(method: HttpMethod, request: RequestInit): void {
  switch (method) {
    // GET, DELETE don't have a request body
    case "GET":
    case "DELETE":
      if (request.body) {
        throw new Error(`${method} can't have a body.`);
      }
      break;
    // POST, PUT, PATCH require a request body
    case "POST":
    case "PUT":
    case "PATCH":
      if (!request.body) {
        throw new Error(`${method} expects a request body.`);
      }
      if (typeof request.body !== "string") {
        throw new Error(`Request body for ${method} must be a JSON string`);
      }
      try {
        JSON.parse(request.body);
      } catch {
        throw new Error(
          `Request body for ${method} must be a valid JSON string`
        );
      }
      break;
    default:
      throw new Error(`Invalid HTTP method: ${method}.`);
  }
}

/**
 * Single entry point for every call the frontend makes to the backend API.
 * @param endpoint Url endpoint for the fetch, relative to /api/v1
 * @param request RequestInit object, body is expected to be stringified beforehand
 * @returns <T> Promise type
 */
export default async function fetchHTTPClient<T>(
  endpoint: string,
  request: RequestInit = {}
): Promise<T> {
  const httpMethod = (request.method as HttpMethod) || "NO METHOD PROVIDED";
  verifyFetchRequest(httpMethod, request);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...request,
      headers: {
        "Content-Type": "application/json",
        ...request.headers,
      },
    });
  } catch {
    throw new HTTPError("Connection to server unavailable", 503);
  }

  if (!response.ok) {
    let errorMessage = `HTTP error! Status: ${response.status}`;
    const errorText = await response.text();
    if (errorText) {
      try {
        const errorBody = JSON.parse(errorText);
        errorMessage = errorBody.error || errorMessage;
      } catch {
        errorMessage = errorText;
      }
    }
    throw new HTTPError(errorMessage, response.status);
  }

  if (response.status == 204) {
    return null as T;
  }

  return response.json();
}
