import { NextRequest, NextResponse } from "next/server";
import MessageService from "@/services/message";
import { withAuth } from "@/utils/withAuth";

export const POST = withAuth<{ id: string }>(
  async (req: NextRequest, { params }, actor) =>
    NextResponse.json(
      await MessageService.send(actor, params.id, await req.json()),
      { status: 201 }
    )
);
