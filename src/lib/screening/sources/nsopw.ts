import { unavailable, type ScreeningSource } from "@/lib/screening/source";

/**
 * The national registry (NSOPW). Its Conditions of Use forbid "automated
 * searching" and its robots.txt disallows /search/, so it is never fetched:
 * every subject gets a link for the admin to search by hand.
 */
export const nsopwSource: ScreeningSource = {
  id: "nsopw",
  label: "National Sex Offender Public Website (NSOPW)",
  manualSearchUrl: "https://www.nsopw.gov/search-0",
  async check(subjects, checkedAt) {
    return new Map(
      subjects.map((s) => [
        s.userId,
        unavailable(nsopwSource, "manual_only", checkedAt),
      ])
    );
  },
};
