"use client";

import { useState } from "react";
import Link from "next/link";
import { screeningLine } from "@/components/admin/ScreeningResults";
import { useAdminApprovals } from "@/components/hooks/useAdmin";
import { PageHeader, Pagination, Spinner } from "@/components/ui/Primitives";
import type { ClientApprovals } from "@/http/adminHTTPClient";
import { formatDate } from "@/lib/dates";
import type { ApprovalQueue } from "@/utils/validation/admin";

interface QueueRow {
  id: string;
  label: string;
  detail: string;
  href: string;
}

const QUEUES: {
  id: ApprovalQueue;
  label: string;
  action: string;
  empty: string;
}[] = [
  {
    id: "clearances",
    label: "Clearances to review",
    action: "Review",
    empty: "No clearances are waiting.",
  },
  {
    id: "awaitingClearance",
    label: "Waiting on clearance",
    action: "Review",
    empty: "No sign-ups are waiting on clearance.",
  },
  {
    id: "rosters",
    label: "Rosters past their date",
    action: "Open roster",
    empty: "Every past roster is approved.",
  },
  {
    id: "reportedThreads",
    label: "Reported threads",
    action: "Read thread",
    empty: "No reported threads are waiting on review.",
  },
];

function rowsFor(data: ClientApprovals): QueueRow[] {
  if (data.queue === "clearances") {
    return data.items.map((person) => ({
      id: person._id,
      label: `${person.firstName} ${person.lastName}`,
      detail: person.email,
      href: `/admin/people/${person._id}`,
    }));
  }
  if (data.queue === "awaitingClearance") {
    return data.items.map(({ volunteer, screening }) => ({
      id: volunteer._id,
      label: `${volunteer.firstName} ${volunteer.lastName}`,
      detail: `${volunteer.email} · ${screeningLine(screening)}`,
      href: `/admin/people/${volunteer._id}`,
    }));
  }
  if (data.queue === "rosters") {
    return data.items.map((event) => ({
      id: event._id,
      label: event.title,
      detail: formatDate(event.eventDate),
      href: `/organizer/events/${event._id}/roster`,
    }));
  }
  return data.items.map((thread) => ({
    id: thread.thread._id,
    label: thread.eventTitle,
    detail: thread.counterpartName,
    href: `/messages/${thread.thread._id}`,
  }));
}

export default function ApprovalsPage() {
  const [queue, setQueue] = useState<ApprovalQueue>("clearances");
  const [page, setPage] = useState(1);
  const approvals = useAdminApprovals({ queue, page: String(page) });
  const data = approvals.data?.queue === queue ? approvals.data : undefined;

  const current = QUEUES.find(
    (item) => item.id === queue
  ) as (typeof QUEUES)[number];
  const counts = approvals.data?.counts;

  const selectQueue = (next: ApprovalQueue) => {
    setQueue(next);
    setPage(1);
  };

  const moveTab = (index: number, direction: number) => {
    const next = (index + direction + QUEUES.length) % QUEUES.length;
    selectQueue(QUEUES[next].id);
    document.getElementById(`approval-tab-${QUEUES[next].id}`)?.focus();
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Approvals"
        description="Everything waiting on a decision. Each row opens where the decision is made."
      />
      <div
        role="tablist"
        aria-label="Approval queues"
        className="flex gap-1 overflow-x-auto border-b border-ink-200"
      >
        {QUEUES.map((item) => (
          <button
            key={item.id}
            id={`approval-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={queue === item.id}
            aria-controls="approval-panel"
            tabIndex={queue === item.id ? 0 : -1}
            onClick={() => selectQueue(item.id)}
            onKeyDown={(event) => {
              const index = QUEUES.findIndex(
                (candidate) => candidate.id === item.id
              );
              if (event.key === "ArrowRight") moveTab(index, 1);
              else if (event.key === "ArrowLeft") moveTab(index, -1);
              else return;
              event.preventDefault();
            }}
            className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold ${queue === item.id ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-900"}`}
          >
            {item.label}
            {counts ? ` (${counts[item.id]})` : ""}
          </button>
        ))}
      </div>
      <section
        id="approval-panel"
        role="tabpanel"
        aria-labelledby={`approval-tab-${queue}`}
        aria-live="polite"
      >
        <h2 className="mb-3 text-lg font-bold text-ink-900">{current.label}</h2>
        {approvals.isError ? (
          <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-800">
            Could not load this queue. Please try again.
          </div>
        ) : !data ? (
          <Spinner />
        ) : data.items.length ? (
          <>
            <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white shadow-card">
              {rowsFor(data).map((row) => (
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
                    {current.action}
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination
              page={data.page}
              total={data.total}
              pageSize={data.pageSize}
              onPage={setPage}
            />
          </>
        ) : (
          <p className="text-sm text-ink-500">{current.empty}</p>
        )}
      </section>
    </div>
  );
}
