import { NextRequest, NextResponse } from "next/server";
import AuthService from "@/services/auth";
import { clientIp } from "@/utils/withAuth";
import { withErrorHandler } from "@/utils/withErrorHandler";

export const POST = withErrorHandler(async (req: NextRequest) => {
  await AuthService.forgotPassword(await req.json(), clientIp(req));
  return new NextResponse(null, { status: 204 });
});
