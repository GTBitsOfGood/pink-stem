import { SCREENING_FETCH_TIMEOUT_MS } from "@/constants/limits";
import { parseCsv } from "@/lib/csv";
import {
  birthYearMatches,
  lastNameKeys,
  nameWords,
  namesMatch,
  parseRegistryName,
  type RegistryName,
} from "@/lib/screening/match";
import { unavailable, type ScreeningSource } from "@/lib/screening/source";
import type {
  RegistryCheckResult,
  RegistryHit,
  RegistrySubject,
} from "@/types/screening";

/**
 * The Georgia registry, read from the full CSV that GBI publishes for download
 * (linked from gbi.georgia.gov as "the latest Georgia sexual offender registry
 * data"). One download per run covers every subject, and nothing is scraped.
 *
 * The file has a birth year but no full date of birth and no per-offender
 * link, so hits point at the GBI search page with the entry's city and county.
 * Only matching entries survive the call; the file itself is never stored.
 */
const CSV_URL = "https://state.sor.gbi.ga.gov/SORT_PUBLIC/sor.csv";
const SEARCH_URL = "https://state.sor.gbi.ga.gov/Sort_Public";

const COLUMNS = {
  name: "NAME",
  yearOfBirth: "YEAR OF BIRTH",
  city: "CITY",
  county: "COUNTY",
} as const;

/** The real file has ~25,000 entries. Far fewer means a truncated or changed download, not "no match". */
const MIN_ENTRIES = 1_000;

const downloadCsv = async (): Promise<string> => {
  const response = await fetch(CSV_URL, {
    headers: { "User-Agent": "PinkStemVolunteerHub/1.0 (screening pre-check)" },
    signal: AbortSignal.timeout(SCREENING_FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`download failed: ${response.status}`);
  return response.text();
};

interface Candidate {
  subject: RegistrySubject & { dateOfBirth: Date };
  name: RegistryName;
}

export interface GbiSourceOptions {
  /** Replaces the download, for checks against a made-up file. */
  loadCsv?: () => Promise<string>;
  minEntries?: number;
}

export const createGbiSource = ({
  loadCsv = downloadCsv,
  minEntries = MIN_ENTRIES,
}: GbiSourceOptions = {}): ScreeningSource => {
  const source: ScreeningSource = {
    id: "gbi_ga",
    label: "Georgia GBI sex offender registry",
    manualSearchUrl: SEARCH_URL,
    async check(subjects, checkedAt) {
      const results = new Map<string, RegistryCheckResult>();
      const hits = new Map<string, RegistryHit[]>();
      // Candidates by last-name key, so each registry row is one lookup.
      const byKey = new Map<string, Candidate[]>();

      for (const subject of subjects) {
        const { dateOfBirth } = subject;
        if (!dateOfBirth) {
          results.set(
            subject.userId,
            unavailable(source, "missing_dob", checkedAt)
          );
          continue;
        }
        const candidate: Candidate = {
          subject: { ...subject, dateOfBirth },
          name: {
            first: nameWords(subject.firstName),
            last: nameWords(subject.lastName),
          },
        };
        hits.set(subject.userId, []);
        for (const key of lastNameKeys(candidate.name.last)) {
          byKey.set(key, [...(byKey.get(key) ?? []), candidate]);
        }
      }
      if (!hits.size) return results;

      const [header, ...rows] = parseCsv(await loadCsv());
      const column = Object.fromEntries(
        Object.entries(COLUMNS).map(([field, title]) => [
          field,
          header?.indexOf(title) ?? -1,
        ])
      ) as Record<keyof typeof COLUMNS, number>;
      if (Object.values(column).some((index) => index === -1)) {
        throw new Error("unexpected CSV columns");
      }
      if (rows.length < minEntries) {
        throw new Error(`only ${rows.length} entries`);
      }

      for (const row of rows) {
        const printed = row[column.name]?.trim();
        if (!printed) continue;
        const entry = parseRegistryName(printed);
        const candidates = new Set(
          lastNameKeys(entry.last).flatMap((key) => byKey.get(key) ?? [])
        );
        if (!candidates.size) continue;

        const year = Number.parseInt(row[column.yearOfBirth] ?? "", 10);
        const yearOfBirth = Number.isNaN(year) ? null : year;
        for (const { subject, name } of candidates) {
          if (!namesMatch(name, entry)) continue;
          if (!birthYearMatches(subject.dateOfBirth, yearOfBirth)) continue;
          const city = row[column.city]?.trim();
          const county = row[column.county]?.trim();
          hits.get(subject.userId)?.push({
            name: printed,
            yearOfBirth,
            location:
              [city, county && `${county} County`].filter(Boolean).join(", ") ||
              undefined,
            url: SEARCH_URL,
          });
        }
      }

      for (const [userId, found] of hits) {
        results.set(
          userId,
          found.length
            ? {
                source: source.id,
                sourceLabel: source.label,
                checkedAt,
                outcome: "possible_match",
                hits: found,
              }
            : {
                source: source.id,
                sourceLabel: source.label,
                checkedAt,
                outcome: "no_match",
              }
        );
      }
      return results;
    },
  };
  return source;
};

export const gbiSource = createGbiSource();
