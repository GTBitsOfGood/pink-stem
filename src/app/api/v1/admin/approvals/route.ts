import AdminService from "@/services/admin";
import { jsonNoStore, queryOf } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth(
  async (req, _ctx, admin) =>
    jsonNoStore(await AdminService.approvals(admin, queryOf(req))),
  { roles: ["admin"] }
);
