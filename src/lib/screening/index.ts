import {
  ScreeningSourceError,
  unavailable,
  type ScreeningSource,
} from "@/lib/screening/source";
import { gbiSource } from "@/lib/screening/sources/gbi";
import { nsopwSource } from "@/lib/screening/sources/nsopw";
import type { RegistryCheckResult, RegistrySubject } from "@/types/screening";

const SCREENING_SOURCES: ScreeningSource[] = [gbiSource, nsopwSource];

/**
 * The screening pre-check: every subject against every source, one result
 * per source per subject, keyed by `userId`. Never throws. A source that fails
 * reports `unavailable`/`source_error` for everyone it was meant to check,
 * and the other sources still run.
 *
 * This only looks things up. It never touches clearance status, and the
 * admin decides what a result means. Nothing here logs names or results.
 */
export async function checkRegistries(
  subjects: RegistrySubject[],
  sources: ScreeningSource[] = SCREENING_SOURCES
): Promise<Map<string, RegistryCheckResult[]>> {
  // One subject per userId (the first), so each gets one result per source.
  const seen = new Set<string>();
  subjects = subjects.filter((s) => !seen.has(s.userId) && seen.add(s.userId));
  const results = new Map<string, RegistryCheckResult[]>(
    subjects.map((s) => [s.userId, []])
  );
  if (!subjects.length) return results;

  const perSource = await Promise.all(
    sources.map(async (source) => {
      const checkedAt = new Date();
      try {
        return {
          source,
          checkedAt,
          found: await source.check(subjects, checkedAt),
        };
      } catch (error) {
        console.error(
          `[screening] ${source.id} failed:`,
          error instanceof ScreeningSourceError
            ? error.message
            : "unexpected error"
        );
        return { source, checkedAt, found: null };
      }
    })
  );

  for (const { source, checkedAt, found } of perSource) {
    for (const subject of subjects) {
      results
        .get(subject.userId)
        ?.push(
          found?.get(subject.userId) ??
            unavailable(source, "source_error", checkedAt)
        );
    }
  }
  return results;
}
