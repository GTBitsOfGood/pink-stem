import { NextResponse } from "next/server";
import ScreeningService from "@/services/screening";
import { withAuth } from "@/utils/withAuth";

/** Queues a registry pre-check rerun; the hourly job runs it. */
export const POST = withAuth<{ id: string }>(
  async (_req, { params }, actor) =>
    NextResponse.json(await ScreeningService.requestRerun(actor, params.id)),
  { roles: ["admin"] }
);
