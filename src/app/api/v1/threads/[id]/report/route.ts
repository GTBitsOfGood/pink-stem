import { NextRequest, NextResponse } from "next/server";
import MessageService from "@/services/message";
import { withAuth } from "@/utils/withAuth";

export const POST = withAuth<{ id: string }>(
  async (req: NextRequest, { params }, actor) => {
    await MessageService.report(actor, params.id, await req.json());
    return new NextResponse(null, { status: 204 });
  }
);
