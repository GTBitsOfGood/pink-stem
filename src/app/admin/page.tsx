"use client";

import Link from "next/link";
import { useAdminApprovals } from "@/components/hooks/useAdmin";
import { PageHeader, Spinner } from "@/components/ui/Primitives";
import { formatDate } from "@/lib/dates";

interface QueueRow {
  id: string;
  label: string;
  detail: string;
  href: string;
}

function Queue({
  title,
  action,
  empty,
  rows,
}: {
  title: string;
  action: string;
  empty: string;
  rows: QueueRow[];
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-ink-900">
        {title}{" "}
        <span className="text-sm font-semibold text-ink-400">
          {rows.length}
        </span>
      </h2>
      {rows.length ? (
        <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white shadow-card">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink-900">
                  {row.label}
                </div>
                <div className="truncate text-[12px] text-ink-500">
                  {row.detail}
                </div>
              </div>
              <Link
                href={row.href}
                className="shrink-0 text-sm font-semibold text-brand-700 hover:underline"
              >
                {action}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-500">{empty}</p>
      )}
    </section>
  );
}

export default function ApprovalsPage() {
  const approvals = useAdminApprovals();
  if (approvals.isPending || !approvals.data) return <Spinner />;
  const a = approvals.data;
  const person = (p: (typeof a.clearances)[number]): QueueRow => ({
    id: p._id,
    label: `${p.firstName} ${p.lastName}`,
    detail: p.email,
    href: `/admin/people/${p._id}`,
  });

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Approvals"
        description="Everything waiting on a decision. Each row opens where the decision is made."
      />
      <Queue
        title="Clearances to review"
        action="Review"
        empty="No clearances are waiting."
        rows={a.clearances.map(person)}
      />
      <Queue
        title="Rosters past their date"
        action="Open roster"
        empty="Every past roster is approved."
        rows={a.rosters.map((e) => ({
          id: e._id,
          label: e.title,
          detail: formatDate(e.eventDate),
          href: `/organizer/events/${e._id}/roster`,
        }))}
      />
      <Queue
        title="Minors awaiting guardian consent"
        action="Open profile"
        empty="No minors are waiting on a guardian."
        rows={a.guardianConsent.map(person)}
      />
      <Queue
        title="Reported threads"
        action="Read thread"
        empty="No reported threads are waiting on review."
        rows={a.reportedThreads.map((t) => ({
          id: t.thread._id,
          label: t.eventTitle,
          detail: t.counterpartName,
          href: `/messages/${t.thread._id}`,
        }))}
      />
    </div>
  );
}
