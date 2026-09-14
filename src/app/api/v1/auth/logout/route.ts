import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";
import { withErrorHandler } from "@/utils/withErrorHandler";

export const POST = withErrorHandler(async () =>
  clearSession(new NextResponse(null, { status: 204 }))
);
