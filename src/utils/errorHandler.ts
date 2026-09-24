import {
  ConflictError,
  ForbiddenError,
  IllegalOperationError,
  InvalidArgumentsError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from "@/types/exceptions";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

const STATUS_BY_ERROR: [new (...args: never[]) => Error, number][] = [
  [InvalidArgumentsError, 400],
  [UnauthorizedError, 401],
  [ForbiddenError, 403],
  [IllegalOperationError, 403],
  [NotFoundError, 404],
  [ConflictError, 409],
  [ValidationError, 422],
  [TooManyRequestsError, 429],
];

/**
 * Converts any thrown value into a JSON error response with the right status.
 * Route handlers never build error responses themselves; they throw and let
 * this decide.
 */
export const handleError = (error: unknown) => {
  if (error instanceof ZodError) {
    const message = error.issues
      .map((issue) =>
        issue.path.length
          ? `${issue.path.join(".")}: ${issue.message}`
          : issue.message
      )
      .join("; ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (error instanceof Error) {
    const match = STATUS_BY_ERROR.find(([type]) => error instanceof type);
    if (match) {
      const body: { error: string; code?: string } = { error: error.message };
      if (error instanceof ConflictError && error.code) {
        body.code = error.code;
      }
      const response = NextResponse.json(body, { status: match[1] });
      if (error instanceof TooManyRequestsError && error.retryAfterMs) {
        response.headers.set(
          "Retry-After",
          String(Math.ceil(error.retryAfterMs / 1000))
        );
      }
      return response;
    }
  }

  console.error("Unhandled error:", error);
  return NextResponse.json(
    { error: "Something went wrong on our side. Please try again." },
    { status: 500 }
  );
};
