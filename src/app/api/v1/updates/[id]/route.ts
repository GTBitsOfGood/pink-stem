import { NextRequest, NextResponse } from "next/server";
import EventUpdateService from "@/services/eventUpdate";
import { withAuth } from "@/utils/withAuth";

type Params = { id: string };

export const PATCH = withAuth<Params>(
  async (req: NextRequest, { params }, actor) =>
    NextResponse.json(
      await EventUpdateService.edit(actor, params.id, await req.json())
    ),
  { roles: ["organizer", "admin"] }
);

export const DELETE = withAuth<Params>(
  async (_req, { params }, actor) => {
    await EventUpdateService.remove(actor, params.id);
    return new NextResponse(null, { status: 204 });
  },
  { roles: ["organizer", "admin"] }
);
