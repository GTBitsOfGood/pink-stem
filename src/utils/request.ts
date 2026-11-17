import { NextRequest, NextResponse } from "next/server";
import { cacheControlMiddleware } from "@/middleware/cache-control";

/** Query string as a plain object, ready for a zod schema. */
export const queryOf = (req: NextRequest): Record<string, string> =>
  Object.fromEntries(req.nextUrl.searchParams);

/** JSON response for reads that must never be cached. */
export const jsonNoStore = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: cacheControlMiddleware() });

export const fileResponse = (
  body: BodyInit,
  filename: string,
  contentType: string
) =>
  new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
