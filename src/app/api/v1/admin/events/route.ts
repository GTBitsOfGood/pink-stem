import { NextRequest } from "next/server";
import EventService from "@/services/event";
import { jsonNoStore, queryOf } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth(
  async (req: NextRequest) =>
    jsonNoStore(await EventService.listAll(queryOf(req))),
  { roles: ["admin"] }
);
