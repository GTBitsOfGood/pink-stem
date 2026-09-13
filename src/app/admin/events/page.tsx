"use client";

import Link from "next/link";
import { useState } from "react";
import ReassignDialog from "@/components/admin/ReassignDialog";
import { spotsSummary } from "@/components/events/EventCard";
import { useAdminEvents } from "@/components/hooks/useAdmin";
import { EventBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Select, inputClasses } from "@/components/ui/Field";
import {
  PageHeader,
  Pagination,
  Spinner,
  Table,
  td,
  th,
} from "@/components/ui/Primitives";
import { EVENT_STATUS_LABELS, PROGRAM_AREA_LABELS } from "@/constants/labels";
import type { ClientEvent } from "@/http/eventHTTPClient";
import { formatDate } from "@/lib/dates";
import { EVENT_STATUSES } from "@/types/event";

export default function AdminEventsPage() {
  const [filters, setFilters] = useState({ q: "", status: "", page: "1" });
  const events = useAdminEvents(filters);
  const [reassigning, setReassigning] = useState<ClientEvent | null>(null);
  const set = (key: keyof typeof filters, value: string) =>
    setFilters({
      ...filters,
      [key]: value,
      page: key === "page" ? value : "1",
    });

  return (
    <div>
      <PageHeader
        title="Events"
        description="Every event across every organizer, including drafts."
      />
      <div className="mb-4 grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-card sm:grid-cols-[1fr_220px]">
        <input
          type="search"
          placeholder="Search title or location"
          aria-label="Search events"
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
          className={inputClasses()}
        />
        <Select
          label="Status"
          className="[&>label]:sr-only"
          placeholder="Any status"
          options={EVENT_STATUSES.map((s) => ({
            value: s,
            label: EVENT_STATUS_LABELS[s],
          }))}
          value={filters.status}
          onChange={(e) => set("status", e.target.value)}
        />
      </div>
      {events.isPending ? (
        <Spinner />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th className={th}>Event</th>
                <th className={th}>Date</th>
                <th className={th}>Organizer</th>
                <th className={th}>Status</th>
                <th className={th}>Fill</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {events.data?.items.map((e) => {
                const s = spotsSummary(e);
                return (
                  <tr key={e._id} className="hover:bg-ink-50">
                    <td className={td}>
                      <Link
                        href={`/organizer/events/${e._id}`}
                        className="font-semibold text-ink-900 hover:text-brand-800"
                      >
                        {e.title}
                      </Link>
                      <div className="text-[12px] text-ink-500">
                        {PROGRAM_AREA_LABELS[e.programArea]}
                      </div>
                    </td>
                    <td className={td}>{formatDate(e.eventDate)}</td>
                    <td className={td}>{e.organizerName}</td>
                    <td className={td}>
                      <EventBadge status={e.status} />
                    </td>
                    <td className={`${td} tabular`}>
                      {s.filled}/{s.capacity}
                    </td>
                    <td className={`${td} text-right`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReassigning(e)}
                      >
                        Reassign
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!events.data?.items.length ? (
                <tr>
                  <td className={td} colSpan={6}>
                    No events match.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </Table>
          {events.data ? (
            <Pagination
              page={events.data.page}
              total={events.data.total}
              pageSize={events.data.pageSize}
              onPage={(p) => set("page", String(p))}
            />
          ) : null}
        </>
      )}
      {reassigning ? (
        <ReassignDialog
          event={reassigning}
          onClose={() => setReassigning(null)}
        />
      ) : null}
    </div>
  );
}
