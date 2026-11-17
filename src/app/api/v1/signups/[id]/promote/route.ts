import { NextResponse } from "next/server";
import SignupService from "@/services/signup";
import { withAuth } from "@/utils/withAuth";

export const POST = withAuth<{ id: string }>(
  async (_req, { params }, actor) =>
    NextResponse.json(await SignupService.promote(actor, params.id)),
  { roles: ["organizer", "admin"] }
);
