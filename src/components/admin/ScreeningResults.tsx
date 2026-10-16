import { ReactNode } from "react";
import Badge from "@/components/ui/Badge";
import {
  REGISTRY_OUTCOME_LABELS,
  REGISTRY_SOURCE_SHORT_LABELS,
  REGISTRY_UNAVAILABLE_LABELS,
} from "@/constants/labels";
import type { ClientScreeningCheck } from "@/http/adminHTTPClient";
import { formatDateTime } from "@/lib/dates";
import type { RegistryCheckResult } from "@/types/screening";
import type { Serialized } from "@/types/models";

type Result = Serialized<RegistryCheckResult>;

const TONE = {
  no_match: "neutral",
  possible_match: "warning",
  unavailable: "info",
} as const;

const outcomeLabel = (r: Result) =>
  r.outcome === "unavailable"
    ? `${REGISTRY_OUTCOME_LABELS.unavailable}: ${REGISTRY_UNAVAILABLE_LABELS[r.reason].toLowerCase()}`
    : REGISTRY_OUTCOME_LABELS[r.outcome];

/** One line for the Approvals queue, e.g. "GBI: No match · NSOPW: Search by hand". */
export function screeningLine(check: ClientScreeningCheck | null): string {
  if (check?.rerunRequestedAt) return "Pre-check rerun queued";
  if (!check?.results.length) return "Pre-check not run yet";
  return check.results
    .map(
      (r) =>
        `${REGISTRY_SOURCE_SHORT_LABELS[r.source]}: ${
          r.outcome === "unavailable"
            ? REGISTRY_UNAVAILABLE_LABELS[r.reason]
            : REGISTRY_OUTCOME_LABELS[r.outcome]
        }`
    )
    .join(" · ");
}

const link = (href: string, children: ReactNode) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="font-semibold text-brand-700 hover:underline"
  >
    {children}
  </a>
);

/** Every source's saved result, with links to verify each hit or search by hand. */
export default function ScreeningResults({ results }: { results: Result[] }) {
  return (
    <ul className="grid gap-3">
      {results.map((r) => (
        <li key={r.source} className="text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink-900">{r.sourceLabel}</span>
            <Badge tone={TONE[r.outcome]}>{outcomeLabel(r)}</Badge>
          </div>
          <div className="text-[12px] text-ink-500">
            Checked {formatDateTime(r.checkedAt)}
          </div>
          {r.outcome === "possible_match" ? (
            <ul className="mt-1 grid gap-1">
              {r.hits.map((hit, i) => (
                <li key={i} className="text-[13px] text-ink-700">
                  {link(hit.url, hit.name)}
                  {hit.yearOfBirth ? ` · born ${hit.yearOfBirth}` : ""}
                  {hit.location ? ` · ${hit.location}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {r.outcome === "unavailable" ? (
            <div className="mt-1 text-[13px]">
              {link(r.manualSearchUrl, "Search this registry by hand")}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
