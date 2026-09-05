import { NextRequest, NextResponse } from "next/server";
import EventService from "@/services/event";
import { withAuth } from "@/utils/withAuth";

export const POST = withAuth<{ id: string }>(
  async (req: NextRequest, { params }, actor) =>
    NextResponse.json(
      await EventService.cancel(actor, params.id, await req.json())
    ),
  { roles: ["organizer", "admin"] }
);
