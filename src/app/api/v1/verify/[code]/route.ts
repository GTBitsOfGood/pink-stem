import { NextRequest } from "next/server";
import CertificateService from "@/services/certificate";
import { jsonNoStore } from "@/utils/request";
import { clientIp } from "@/utils/withAuth";
import { withErrorHandler } from "@/utils/withErrorHandler";

/** Public, rate-limited, and deliberately minimal. */
export const GET = withErrorHandler<{ code: string }>(
  async (req: NextRequest, { params }) =>
    jsonNoStore(await CertificateService.verify(params.code, clientIp(req)))
);
