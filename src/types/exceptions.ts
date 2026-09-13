/**
 * The error taxonomy for the whole app.
 *
 * Services throw these; `@/utils/errorHandler` is the single place that maps
 * them to HTTP status codes. Adding a failure mode means adding a class here
 * and one case there.
 */

export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
  }
}

export class InvalidArgumentsError extends Error {
  constructor(message = "Invalid arguments provided") {
    super(message);
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized access") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that") {
    super(message);
  }
}

/** Optional machine-readable code so the client can branch on the conflict. */
export class ConflictError extends Error {
  constructor(
    message = "Resource conflict",
    public readonly code?: string
  ) {
    super(message);
  }
}

export class ValidationError extends Error {
  constructor(message = "Validation failed") {
    super(message);
  }
}

export class IllegalOperationError extends Error {
  constructor(message = "Illegal operation attempted") {
    super(message);
  }
}

export class TooManyRequestsError extends Error {
  constructor(message = "Too many requests. Please try again shortly.") {
    super(message);
  }
}

/** Raised by the frontend HTTP client when a response comes back non-2xx. */
export class HTTPError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "HTTPError";
  }
}
