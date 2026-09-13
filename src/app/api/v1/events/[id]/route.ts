import { NextRequest, NextResponse } from "next/server";
import EventService from "@/services/event";
import { jsonNoStore } from "@/utils/request";
import { withAuth, withOptionalAuth } from "@/utils/withAuth";

type Params = { id: string };

export const GET = withOptionalAuth<Params>(async (_req, { params }, actor) =>
  jsonNoStore(await EventService.get(params.id, actor))
);

export const PATCH = withAuth<Params>(
  async (req: NextRequest, { params }, actor) =>
    NextResponse.json(
      await EventService.update(actor, params.id, await req.json())
    ),
  { roles: ["organizer", "admin"] }
);
