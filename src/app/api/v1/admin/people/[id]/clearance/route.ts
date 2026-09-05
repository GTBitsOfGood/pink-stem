import { NextRequest, NextResponse } from "next/server";
import ClearanceService from "@/services/clearance";
import { withAuth } from "@/utils/withAuth";

export const PUT = withAuth<{ id: string }>(
  async (req: NextRequest, { params }, actor) =>
    NextResponse.json(
      await ClearanceService.record(actor, params.id, await req.json())
    ),
  { roles: ["admin"] }
);
