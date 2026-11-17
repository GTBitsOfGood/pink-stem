import SignupService from "@/services/signup";
import { fileResponse } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth<{ id: string }>(async (_req, { params }, actor) =>
  fileResponse(
    await SignupService.calendar(actor, params.id),
    "pink-stem-shift.ics",
    "text/calendar; charset=utf-8"
  )
);
