import { NextRequest, NextResponse } from "next/server";
import CertificateService from "@/services/certificate";
import { withAuth } from "@/utils/withAuth";

export const POST = withAuth<{ id: string }>(
  async (req: NextRequest, { params }, actor) =>
    NextResponse.json(
      await CertificateService.revoke(actor, params.id, await req.json())
    ),
  { roles: ["admin"] }
);
