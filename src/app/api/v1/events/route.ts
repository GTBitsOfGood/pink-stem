import { NextRequest, NextResponse } from "next/server";
import EventService from "@/services/event";
import { jsonNoStore, queryOf } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";
import { withErrorHandler } from "@/utils/withErrorHandler";

export const GET = withErrorHandler(async (req: NextRequest) =>
  jsonNoStore(await EventService.list(queryOf(req)))
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, actor) =>
    NextResponse.json(await EventService.create(actor, await req.json()), {
      status: 201,
    }),
  { roles: ["organizer", "admin"] }
);
