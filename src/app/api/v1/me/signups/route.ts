import SignupService from "@/services/signup";
import { jsonNoStore } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth(async (_req, _ctx, actor) =>
  jsonNoStore(await SignupService.mine(actor))
);
