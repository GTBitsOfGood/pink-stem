import { NextResponse } from "next/server";
import AttendanceService from "@/services/attendance";
import SignupService from "@/services/signup";
import { jsonNoStore } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

type Params = { id: string };

export const GET = withAuth<Params>(
  async (_req, { params }, actor) =>
    jsonNoStore(await SignupService.roster(actor, params.id)),
  { roles: ["organizer", "admin"] }
);

/** Approves the roster: posts hours, completes the event, issues certificates. */
export const POST = withAuth<Params>(
  async (_req, { params }, actor) =>
    NextResponse.json(await AttendanceService.approveRoster(actor, params.id)),
  { roles: ["organizer", "admin"] }
);
