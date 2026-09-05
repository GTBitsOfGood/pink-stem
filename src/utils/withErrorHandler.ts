import { NextRequest, NextResponse } from "next/server";
import { handleError } from "./errorHandler";

type RouteHandler<T = unknown> = (
  req: NextRequest,
  context: { params: T }
) => Promise<NextResponse>;

/**
 * Wraps public API route handlers.
 *
 * It resolves Next.js' async `params` once, and funnels every thrown error
 * through `handleError` so handlers stay thin and never build error responses
 * by hand. Routes that need a signed-in user use `withAuth`, which layers
 * session handling on this same shape.
 */
export function withErrorHandler<T = Record<string, never>>(
  handler: RouteHandler<T>
): (
  req: NextRequest,
  context: { params: Promise<T> }
) => Promise<NextResponse> {
  return async (req, context) => {
    try {
      const resolvedParams = await context.params;
      return await handler(req, { params: resolvedParams });
    } catch (error) {
      return handleError(error);
    }
  };
}
