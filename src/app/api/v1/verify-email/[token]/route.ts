import { NextResponse } from "next/server";
import UserService from "@/services/user";
import { jsonNoStore } from "@/utils/request";
import { clientIp } from "@/utils/withAuth";
import { withErrorHandler } from "@/utils/withErrorHandler";

type Params = { token: string };

export const GET = withErrorHandler<Params>(async (req, { params }) =>
  jsonNoStore(await UserService.verifyEmailInfo(params.token, clientIp(req)))
);

export const POST = withErrorHandler<Params>(async (_req, { params }) => {
  await UserService.verifyEmail(params.token);
  return new NextResponse(null, { status: 204 });
});
