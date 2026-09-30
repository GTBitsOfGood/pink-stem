import { unavailable, type ScreeningSource } from "@/lib/screening/source";
import { gbiSource } from "@/lib/screening/sources/gbi";
import { nsopwSource } from "@/lib/screening/sources/nsopw";
import type { RegistryCheckResult, RegistrySubject } from "@/types/screening";

export const SCREENING_SOURCES: ScreeningSource[] = [gbiSource, nsopwSource];

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
          error instanceof Error ? error.message : "unknown error"
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
