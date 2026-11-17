import { NextResponse } from "next/server";
import AdminService from "@/services/admin";
import { withAuth } from "@/utils/withAuth";

export const POST = withAuth<{ id: string }>(
  async (_req, { params }, actor) => {
    await AdminService.forceSignout(actor, params.id);
    return new NextResponse(null, { status: 204 });
  },
  { roles: ["admin"] }
);
