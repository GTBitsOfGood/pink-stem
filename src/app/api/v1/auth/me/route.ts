import UserService from "@/services/user";
import { jsonNoStore } from "@/utils/request";
import { withOptionalAuth } from "@/utils/withAuth";

/** The signed-in user, or `null` when there is no session. */
export const GET = withOptionalAuth(async (_req, _ctx, actor) =>
  jsonNoStore(actor ? await UserService.getMe(actor) : null)
);
