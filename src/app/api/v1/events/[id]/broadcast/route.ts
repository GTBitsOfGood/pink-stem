import { NextRequest, NextResponse } from "next/server";
import MessageService from "@/services/message";
import { withAuth } from "@/utils/withAuth";

/** Messages a whole roster; lands as individual threads. */
export const POST = withAuth<{ id: string }>(
  async (req: NextRequest, { params }, actor) =>
    NextResponse.json(
      await MessageService.broadcast(actor, params.id, await req.json())
    ),
  { roles: ["organizer", "admin"] }
);
