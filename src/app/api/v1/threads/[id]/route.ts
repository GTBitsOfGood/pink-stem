import MessageService from "@/services/message";
import { jsonNoStore } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth<{ id: string }>(async (_req, { params }, actor) =>
  jsonNoStore(await MessageService.getThread(actor, params.id))
);
