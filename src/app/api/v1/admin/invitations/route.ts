import { NextRequest, NextResponse } from "next/server";
import AdminService from "@/services/admin";
import { jsonNoStore } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth(
  async () => jsonNoStore(await AdminService.pendingInvites()),
  { roles: ["admin"] }
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, actor) => {
    await AdminService.invite(actor, await req.json());
    return new NextResponse(null, { status: 204 });
  },
  { roles: ["admin"] }
);
