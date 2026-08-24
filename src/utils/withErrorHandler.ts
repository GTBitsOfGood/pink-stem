import { NextRequest, NextResponse } from "next/server";
import { handleError } from "./errorHandler";

type RouteHandler<T = unknown> = (
  req: NextRequest,
  context: { params: T }
) => Promise<NextResponse>;

/**
 * Higher-order function that wraps API route handlers.
 *
 * It resolves Next.js' async `params` once, and funnels every thrown error
 * through `handleError` so handlers stay thin and never build error responses
 * by hand. Projects that need authentication layer a `withAuth` on top of this
 * same shape.
 */
export function withErrorHandler<T = unknown>(
  handler: RouteHandler<T>
): (
  req: NextRequest,
  context: { params: Promise<T> }
) => Promise<NextResponse> {
  return async (
    req: NextRequest,
    context: { params: Promise<T> }
  ): Promise<NextResponse> => {
    try {
      const resolvedParams = await context.params;
      return await handler(req, { params: resolvedParams });
    } catch (error) {
      return handleError(error);
    }
  };
}
