import type {
  RegistryCheckResult,
  RegistrySource,
  RegistrySubject,
  RegistryUnavailableReason,
} from "@/types/screening";

/**
 * One place to look someone up. Adding a registry, or swapping them all for a
 * vendor API, is a new implementation of this and nothing else.
 */
export interface ScreeningSource {
  id: RegistrySource;
  label: string;
  /** Where an admin searches by hand when the automated check can't answer. */
  manualSearchUrl: string;
  /** Checks every subject in one pass. May throw; the caller turns that into `source_error`. */
  check(
    subjects: RegistrySubject[],
    checkedAt: Date
  ): Promise<Map<string, RegistryCheckResult>>;
}

export const unavailable = (
  source: ScreeningSource,
  reason: RegistryUnavailableReason,
  checkedAt: Date
): RegistryCheckResult => ({
  source: source.id,
  sourceLabel: source.label,
  checkedAt,
  outcome: "unavailable",
  reason,
  manualSearchUrl: source.manualSearchUrl,
});
