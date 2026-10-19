import { NextRequest, NextResponse } from "next/server";
import { attachSession } from "@/lib/session";
import AuthService from "@/services/auth";
import { withAuth } from "@/utils/withAuth";

export const POST = withAuth(async (req: NextRequest, _ctx, actor) => {
  const { token } = await AuthService.changePassword(actor, await req.json());
  return attachSession(new NextResponse(null, { status: 204 }), token);
});
