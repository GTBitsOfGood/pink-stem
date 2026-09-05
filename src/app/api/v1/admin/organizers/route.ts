import AdminService from "@/services/admin";
import { jsonNoStore } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth(
  async () => jsonNoStore(await AdminService.organizers()),
  { roles: ["admin"] }
);
