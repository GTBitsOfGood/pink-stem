import { NextResponse } from "next/server";
import UserService from "@/services/user";
import { withAuth } from "@/utils/withAuth";

/** Re-sends the verification link to the signed-in user's own email. */
export const POST = withAuth(async (_req, _ctx, actor) => {
  await UserService.resendEmailVerification(actor);
  return new NextResponse(null, { status: 204 });
});
