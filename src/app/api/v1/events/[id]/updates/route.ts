import { NextRequest, NextResponse } from "next/server";
import EventUpdateService from "@/services/eventUpdate";
import { withAuth } from "@/utils/withAuth";

export const POST = withAuth<{ id: string }>(
  async (req: NextRequest, { params }, actor) =>
    NextResponse.json(
      await EventUpdateService.create(actor, params.id, await req.json()),
      { status: 201 }
    ),
  { roles: ["organizer", "admin"] }
);
