import { NextResponse } from "next/server";
import UserService from "@/services/user";
import { clientIp } from "@/utils/withAuth";
import { jsonNoStore } from "@/utils/request";
import { withErrorHandler } from "@/utils/withErrorHandler";

type Params = { token: string };

export const GET = withErrorHandler<Params>(async (_req, { params }) =>
  jsonNoStore(
    await UserService.guardianConsentInfo(params.token, clientIp(_req))
  )
);

export const POST = withErrorHandler<Params>(async (_req, { params }) =>
  NextResponse.json(await UserService.giveGuardianConsent(params.token))
);
