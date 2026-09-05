import { NextRequest } from "next/server";
import AdminService from "@/services/admin";
import { jsonNoStore, queryOf } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth(
  async (req: NextRequest) =>
    jsonNoStore(await AdminService.listPeople(queryOf(req))),
  { roles: ["admin"] }
);
