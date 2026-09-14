"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useReport } from "@/components/hooks/useAdmin";
import { Input } from "@/components/ui/Field";
import { PageHeader, Spinner, Table, td, th } from "@/components/ui/Primitives";
import AdminHTTPClient from "@/http/adminHTTPClient";
import { formatShortDate, toDateInput } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { REPORT_KINDS, ReportKind } from "@/utils/validation/admin";

const KIND_LABELS: Record<ReportKind, { label: string; description: string }> =
  {
    hours: {
      label: "Hours",
      description:
        "Total volunteer hours by event, program area, and month. Ready when a grant is due.",
    },
    volunteers: {
      label: "Volunteers",
      description:
        "Who served in the period, how many joined, and the repeat rate.",
    },
    fill: {
      label: "Fill rate",
      description: "Share of shift capacity that was confirmed. Target 85%.",
    },
    no_shows: {
      label: "No-shows",
      description: "Confirmed volunteers marked absent. Target under 10%.",
    },
  };

export default function ReportsPage() {
  const [kind, setKind] = useState<ReportKind>("hours");
  const year = new Date().getFullYear();
  const [range, setRange] = useState({
    from: `${year}-01-01`,
    to: toDateInput(new Date()),
  });
  const report = useReport(kind, range.from, range.to);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Every report exports to CSV."
        action={
          <a
            href={AdminHTTPClient.reportCsvUrl(kind, range.from, range.to)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-800 hover:bg-ink-50"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {REPORT_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold",
              kind === k
                ? "bg-ink-900 text-white"
                : "bg-white text-ink-700 border border-ink-200 hover:bg-ink-50"
            )}
          >
            {KIND_LABELS[k].label}
          </button>
        ))}
      </div>
      <p className="mb-4 text-sm text-ink-500">
        {KIND_LABELS[kind].description}
      </p>
      <div className="mb-6 grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-card sm:grid-cols-2">
        <Input
          label="From"
          type="date"
          value={range.from}
          onChange={(e) => setRange({ ...range, from: e.target.value })}
        />
        <Input
          label="To"
          type="date"
          value={range.to}
          onChange={(e) => setRange({ ...range, to: e.target.value })}
        />
      </div>
      {report.isPending || !report.data ? (
        <Spinner />
      ) : (
        <div className="grid gap-6">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {report.data.summary.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-ink-200 bg-white px-4 py-3 shadow-card"
              >
                <dt className="text-[13px] font-semibold text-ink-500">
                  {s.label}
                </dt>
                <dd className="mt-0.5 text-xl font-bold text-ink-900 tabular">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
          <Table>
            <thead>
              <tr>
                {report.data.columns.map((c) => (
                  <th key={c.key} className={th}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.data.rows.map((row, i) => (
                <tr key={i}>
                  {report.data.columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        td,
                        typeof row[c.key] === "number" && "tabular"
                      )}
                    >
                      {c.key === "eventDate" && row[c.key]
                        ? formatShortDate(row[c.key] as string)
                        : String(row[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
              {!report.data.rows.length ? (
                <tr>
                  <td className={td} colSpan={report.data.columns.length}>
                    Nothing in this period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
