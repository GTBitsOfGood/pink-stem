"use client";

import Link from "next/link";
import EventCard from "@/components/events/EventCard";
import { useAdminOverview } from "@/components/hooks/useAdmin";
import { Stat } from "@/components/ui/Card";
import { Spinner, Table, td, th } from "@/components/ui/Primitives";
import { AUDIT_ACTION_LABELS } from "@/constants/labels";
import { formatDateTime, formatHours } from "@/lib/dates";

export default function AdminOverviewPage() {
  const overview = useAdminOverview();
  if (overview.isPending || !overview.data) return <Spinner />;
  const o = overview.data;
  return (
    <div className="grid gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active volunteers" value={o.volunteers} />
        <Stat label="Organizers & admins" value={o.organizers} />
        <Stat label="Upcoming events" value={o.upcomingEvents} />
        <Stat
          label="Total approved hours"
          value={formatHours(o.totalHours)}
          tone="brand"
        />
        <Stat
          label="Clearances awaiting review"
          value={o.pendingClearances}
          hint={
            o.pendingClearances ? "Record outcomes under People" : undefined
          }
        />
        <Stat
          label="Volunteers flagged for review"
          value={o.flaggedVolunteers}
        />
        <Stat
          label="Rosters unapproved"
          value={o.unapprovedRosters}
          hint={o.unapprovedRosters ? "Hours waiting on organizers" : undefined}
        />
        <Stat label="Shifts under minimum (72h)" value={o.lowFillShifts} />
      </div>
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-ink-900">Next up</h2>
          <Link
            href="/admin/events"
            className="text-sm font-semibold text-brand-700 hover:underline"
          >
            All events
          </Link>
        </div>
        {o.upcoming.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {o.upcoming.map((e) => (
              <EventCard
                key={e._id}
                event={e}
                href={`/organizer/events/${e._id}`}
                showStatus
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-500">No published events coming up.</p>
        )}
      </section>
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-ink-900">Recent activity</h2>
          <Link
            href="/admin/audit"
            className="text-sm font-semibold text-brand-700 hover:underline"
          >
            Full audit log
          </Link>
        </div>
        <Table>
          <thead>
            <tr>
              <th className={th}>When</th>
              <th className={th}>Who</th>
              <th className={th}>Action</th>
              <th className={th}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {o.recentAudit.map((row) => (
              <tr key={row._id}>
                <td className={td}>{formatDateTime(row.createdAt)}</td>
                <td className={td}>{row.actorName}</td>
                <td className={td}>{AUDIT_ACTION_LABELS[row.action]}</td>
                <td className={`${td} font-mono text-xs text-ink-500`}>
                  {row.after ? JSON.stringify(row.after) : ""}
                </td>
              </tr>
            ))}
            {!o.recentAudit.length ? (
              <tr>
                <td className={td} colSpan={4}>
                  Nothing recorded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </section>
    </div>
  );
}
