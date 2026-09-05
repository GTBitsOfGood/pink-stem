import { NextRequest, NextResponse } from "next/server";
import { attachSession } from "@/lib/session";
import AuthService from "@/services/auth";
import { jsonNoStore } from "@/utils/request";
import { withErrorHandler } from "@/utils/withErrorHandler";

type Params = { token: string };

export const GET = withErrorHandler<Params>(async (_req, { params }) =>
  jsonNoStore(await AuthService.getInvite(params.token))
);

export const POST = withErrorHandler<Params>(
  async (req: NextRequest, { params }) => {
    const { token, user } = await AuthService.acceptInvite({
      ...(await req.json()),
      token: params.token,
    });
    return attachSession(NextResponse.json(user, { status: 201 }), token);
  }
);
