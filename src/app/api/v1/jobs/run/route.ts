import { NextRequest, NextResponse } from "next/server";
import NotificationLogDAO from "@/db/actions/notificationLog";
import { JOB_LOCK_TTL_MS } from "@/constants/limits";
import JobService from "@/services/jobs";
import { UnauthorizedError } from "@/types/exceptions";
import ERRORS from "@/utils/errorMessages";
import { withErrorHandler } from "@/utils/withErrorHandler";

const JOB_LOCK_KEY = "jobs:run:lock";

/** Called on a schedule (see netlify/functions). Protected by a shared secret. */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new UnauthorizedError(ERRORS.JOBS.UNAUTHORIZED);
  }

  const acquired = await NotificationLogDAO.acquireLock(
    JOB_LOCK_KEY,
    JOB_LOCK_TTL_MS
  );
  if (!acquired) {
    // Another run (scheduled or manual) is already in progress. Not an
    // error — this is the overlap protection working as intended.
    return NextResponse.json({ skipped: true, reason: "already running" });
  }

  try {
    return NextResponse.json(await JobService.runAll());
  } finally {
    await NotificationLogDAO.releaseLock(JOB_LOCK_KEY);
  }
});
