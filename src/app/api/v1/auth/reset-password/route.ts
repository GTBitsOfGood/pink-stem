import { NextRequest, NextResponse } from "next/server";
import { attachSession } from "@/lib/session";
import AuthService from "@/services/auth";
import { withErrorHandler } from "@/utils/withErrorHandler";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { token, user } = await AuthService.resetPassword(await req.json());
  return attachSession(NextResponse.json(user), token);
});
