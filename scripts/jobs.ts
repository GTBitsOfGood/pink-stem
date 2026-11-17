/**
 * Triggers the scheduled job runner against a local dev server.
 *
 *   npm run jobs
 *
 * Reads CRON_SECRET from .env.local, the same file the dev server reads, so the
 * secret the request sends and the secret the route expects cannot drift.
 * Requires `npm run dev` to already be running.
 */
const BASE = process.env.APP_URL ?? "http://localhost:3000";

async function main(): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not set in .env.local. Add one and re-run.");
    process.exit(1);
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}/api/v1/jobs/run`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
  } catch {
    console.error(`Could not reach ${BASE}. Is \`npm run dev\` running?`);
    process.exit(1);
  }

  const body = await response.text();
  if (!response.ok) {
    console.error(`${response.status} ${body}`);
    process.exit(1);
  }
  console.log(body);
}

main();
