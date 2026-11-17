import { NextRequest, NextResponse } from "next/server";
import EventService from "@/services/event";
import { withAuth } from "@/utils/withAuth";

export const POST = withAuth<{ id: string }>(
  async (req: NextRequest, { params }, actor) => {
    const body = await req.json().catch(() => undefined);
    return NextResponse.json(
      await EventService.duplicate(actor, params.id, body)
    );
  },
  { roles: ["organizer", "admin"] }
);
