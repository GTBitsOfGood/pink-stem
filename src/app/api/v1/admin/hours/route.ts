import { NextRequest, NextResponse } from "next/server";
import HoursService from "@/services/hours";
import { withAuth } from "@/utils/withAuth";

/** Manual hour adjustment; audited, and reissues affected certificates. */
export const POST = withAuth(
  async (req: NextRequest, _ctx, actor) =>
    NextResponse.json(await HoursService.adjust(actor, await req.json())),
  { roles: ["admin"] }
);
