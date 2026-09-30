/**
 * The screening pre-check result, shared between the lookups
 * (src/lib/screening) and whatever stores and shows them. A vendor API that
 * replaces the public registries returns this same shape.
 */
export const REGISTRY_SOURCES = ["gbi_ga", "nsopw"] as const;
export type RegistrySource = (typeof REGISTRY_SOURCES)[number];

export const REGISTRY_OUTCOMES = [
  "no_match",
  "possible_match",
  "unavailable",
] as const;
export type RegistryOutcome = (typeof REGISTRY_OUTCOMES)[number];

/** Why a source couldn't be checked automatically. Each comes with a manual link. */
export const REGISTRY_UNAVAILABLE_REASONS = [
  "manual_only",
  "missing_dob",
  "source_error",
] as const;
export type RegistryUnavailableReason =
  (typeof REGISTRY_UNAVAILABLE_REASONS)[number];

/** One registry entry whose name and birth year fit the volunteer. Never the full record. */
export interface RegistryHit {
  /** As the registry prints it, e.g. "DOE, JANE A". */
  name: string;
  yearOfBirth: number | null;
  /** City and county, so the admin can pick the right entry when verifying. */
  location?: string;
  /** Where the admin goes to verify this hit. */
  url: string;
}

interface RegistryCheckBase {
  source: RegistrySource;
  sourceLabel: string;
  checkedAt: Date;
}

export type RegistryCheckResult = RegistryCheckBase &
  (
    | { outcome: "no_match" }
    | { outcome: "possible_match"; hits: RegistryHit[] }
    | {
        outcome: "unavailable";
        reason: RegistryUnavailableReason;
        manualSearchUrl: string;
      }
  );

/** Who to look up. `userId` keys the results; it is never sent to a source. */
export interface RegistrySubject {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | null;
}
