import type { SendCounts, SendOutcome } from "@/types/notification";

export function emptyCounts(): SendCounts {
  return { sent: 0, skipped: 0, failed: 0 };
}

export function countOutcomes(outcomes: SendOutcome[]): SendCounts {
  const counts = emptyCounts();
  for (const outcome of outcomes) counts[outcome] += 1;
  return counts;
}

/** Adds `from` into `into` and returns `into`. */
export function addCounts(into: SendCounts, from: SendCounts): SendCounts {
  into.sent += from.sent;
  into.skipped += from.skipped;
  into.failed += from.failed;
  return into;
}
