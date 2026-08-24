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

export class ConflictError extends Error {
  constructor(message = "Resource conflict") {
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

export class MethodNotAllowedError extends Error {
  constructor(message = "Method not allowed") {
    super(message);
  }
}

/** Raised by the frontend HTTP client when a response comes back non-2xx. */
export class HTTPError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HTTPError";
    this.status = status;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HTTPError);
    }
  }
}
