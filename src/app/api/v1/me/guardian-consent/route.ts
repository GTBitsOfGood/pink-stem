import { NextResponse } from "next/server";
import UserService from "@/services/user";
import { withAuth } from "@/utils/withAuth";

/** Re-sends the consent link to the guardian on file. */
export const POST = withAuth(async (_req, _ctx, actor) => {
  await UserService.resendGuardianConsent(actor);
  return new NextResponse(null, { status: 204 });
});
