import { NextRequest, NextResponse } from "next/server";
import SignupService from "@/services/signup";
import { withAuth } from "@/utils/withAuth";

export const POST = withAuth<{ id: string }>(
  async (req: NextRequest, { params }, actor) =>
    NextResponse.json(
      await SignupService.cancel(actor, params.id, await req.json())
    )
);
