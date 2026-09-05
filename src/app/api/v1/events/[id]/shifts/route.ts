import { NextRequest, NextResponse } from "next/server";
import EventService from "@/services/event";
import { withAuth } from "@/utils/withAuth";

export const POST = withAuth<{ id: string }>(
  async (req: NextRequest, { params }, actor) =>
    NextResponse.json(
      await EventService.addShift(actor, params.id, await req.json()),
      { status: 201 }
    ),
  { roles: ["organizer", "admin"] }
);
