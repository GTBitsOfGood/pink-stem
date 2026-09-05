import { NextRequest, NextResponse } from "next/server";
import AuthService from "@/services/auth";
import { withAuth } from "@/utils/withAuth";
import { withErrorHandler } from "@/utils/withErrorHandler";

/** Consumes the emailed link. */
export const POST = withErrorHandler(async (req: NextRequest) => {
  await AuthService.verifyEmail(await req.json());
  return new NextResponse(null, { status: 204 });
});

/** Sends a fresh link to the signed-in user. */
export const PUT = withAuth(async (_req, _ctx, actor) => {
  await AuthService.resendVerification(actor);
  return new NextResponse(null, { status: 204 });
});
