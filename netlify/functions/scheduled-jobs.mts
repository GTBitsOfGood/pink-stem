import type { Config } from "@netlify/functions";

/**
 * Hourly trigger for reminders, digests, clearance expiry, and roster nudges.
 * The work itself lives in the app (POST /api/v1/jobs/run) so it shares the
 * services and the database connection; this function only rings the bell.
 */
const handler = async () => {
  const base = process.env.URL ?? process.env.APP_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.warn("[scheduled-jobs] URL or CRON_SECRET missing; skipping");
    return;
  }
  const response = await fetch(`${base}/api/v1/jobs/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  console.log(`[scheduled-jobs] ${response.status}`, await response.text());
};

export default handler;

export const config: Config = {
  schedule: "@hourly",
};
