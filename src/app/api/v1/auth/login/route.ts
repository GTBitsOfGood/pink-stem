import { NextRequest, NextResponse } from "next/server";
import { attachSession } from "@/lib/session";
import AuthService from "@/services/auth";
import { clientIp } from "@/utils/withAuth";
import { withErrorHandler } from "@/utils/withErrorHandler";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { token, user } = await AuthService.login(
    await req.json(),
    clientIp(req)
  );
  return attachSession(NextResponse.json(user), token);
});
