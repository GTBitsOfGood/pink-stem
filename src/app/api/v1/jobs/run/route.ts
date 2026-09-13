import { NextRequest, NextResponse } from "next/server";
import JobService from "@/services/jobs";
import { UnauthorizedError } from "@/types/exceptions";
import ERRORS from "@/utils/errorMessages";
import { withErrorHandler } from "@/utils/withErrorHandler";

/** Called on a schedule (see netlify/functions). Protected by a shared secret. */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new UnauthorizedError(ERRORS.JOBS.UNAUTHORIZED);
  }
  return NextResponse.json(await JobService.runAll());
});
