import { NextRequest, NextResponse } from "next/server";
import CertificateService from "@/services/certificate";
import { withAuth } from "@/utils/withAuth";

/** Requests a cumulative service record for a date range. */
export const POST = withAuth(async (req: NextRequest, _ctx, actor) =>
  NextResponse.json(
    await CertificateService.requestServiceRecord(actor, await req.json()),
    { status: 201 }
  )
);
