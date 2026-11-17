import EventService from "@/services/event";
import { jsonNoStore } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth(
  async (_req, _ctx, actor) =>
    jsonNoStore(await EventService.listForOrganizer(actor)),
  { roles: ["organizer", "admin"] }
);
