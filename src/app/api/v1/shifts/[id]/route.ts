import { NextRequest, NextResponse } from "next/server";
import EventService from "@/services/event";
import { withAuth } from "@/utils/withAuth";

type Params = { id: string };

export const PATCH = withAuth<Params>(
  async (req: NextRequest, { params }, actor) =>
    NextResponse.json(
      await EventService.updateShift(actor, params.id, await req.json())
    ),
  { roles: ["organizer", "admin"] }
);

export const DELETE = withAuth<Params>(
  async (_req, { params }, actor) => {
    await EventService.deleteShift(actor, params.id);
    return new NextResponse(null, { status: 204 });
  },
  { roles: ["organizer", "admin"] }
);
