import { NextRequest, NextResponse } from "next/server";
import AttendanceService from "@/services/attendance";
import { withAuth } from "@/utils/withAuth";

export const PATCH = withAuth<{ id: string }>(
  async (req: NextRequest, { params }, actor) =>
    NextResponse.json(
      await AttendanceService.mark(actor, params.id, await req.json())
    ),
  { roles: ["organizer", "admin"] }
);
