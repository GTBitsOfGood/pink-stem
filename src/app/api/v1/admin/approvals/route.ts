import AdminService from "@/services/admin";
import { jsonNoStore } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth(
  async (_req, _ctx, admin) => jsonNoStore(await AdminService.approvals(admin)),
  { roles: ["admin"] }
);
