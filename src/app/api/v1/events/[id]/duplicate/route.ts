import { NextResponse } from "next/server";
import EventService from "@/services/event";
import { withAuth } from "@/utils/withAuth";

export const POST = withAuth<{ id: string }>(
  async (_req, { params }, actor) =>
    NextResponse.json(await EventService.duplicate(actor, params.id)),
  { roles: ["organizer", "admin"] }
);
