import { NextRequest, NextResponse } from "next/server";
import AdminService from "@/services/admin";
import { jsonNoStore } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

type Params = { id: string };

export const GET = withAuth<Params>(
  async (_req, { params }) =>
    jsonNoStore(await AdminService.getPerson(params.id)),
  { roles: ["admin"] }
);

export const PATCH = withAuth<Params>(
  async (req: NextRequest, { params }, actor) =>
    NextResponse.json(
      await AdminService.updateUser(actor, params.id, await req.json())
    ),
  { roles: ["admin"] }
);
