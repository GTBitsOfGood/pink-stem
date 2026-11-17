import { NextResponse } from "next/server";
import MessageService from "@/services/message";
import { withAuth } from "@/utils/withAuth";

/** Marks a thread's open reports reviewed, clearing it from Approvals. */
export const POST = withAuth<{ id: string }>(
  async (_req, { params }, actor) => {
    await MessageService.reviewReports(actor, params.id);
    return new NextResponse(null, { status: 204 });
  },
  { roles: ["admin"] }
);
