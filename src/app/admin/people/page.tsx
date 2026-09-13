"use client";

import Link from "next/link";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import InviteDialog from "@/components/admin/InviteDialog";
import { usePeople } from "@/components/hooks/useAdmin";
import Badge, { ClearanceBadge } from "@/components/ui/Badge";
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
import { CLEARANCE_LABELS, ROLE_LABELS } from "@/constants/labels";
import { formatHours, formatShortDate } from "@/lib/dates";
import { CLEARANCE_STATUSES, ROLES } from "@/types/user";

export default function PeoplePage() {
  const [filters, setFilters] = useState({
    q: "",
    role: "",
    status: "",
    clearance: "",
    flagged: "",
    page: "1",
  });
  const people = usePeople(filters);
  const [inviting, setInviting] = useState(false);
  const set = (key: keyof typeof filters, value: string) =>
    setFilters({
      ...filters,
      [key]: value,
      page: key === "page" ? value : "1",
    });

  return (
    <div>
      <PageHeader
        title="People"
        description="Every account, with clearance status and hours at a glance."
        action={
          <Button
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => setInviting(true)}
          >
            Invite organizer
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-card md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
        <input
          type="search"
          placeholder="Search name or email"
          aria-label="Search people"
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
          className={inputClasses()}
        />
        <Select
          label="Role"
          className="[&>label]:sr-only"
          placeholder="All roles"
          options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          value={filters.role}
          onChange={(e) => set("role", e.target.value)}
        />
        <Select
          label="Clearance"
          className="[&>label]:sr-only"
          placeholder="Any clearance"
          options={CLEARANCE_STATUSES.map((c) => ({
            value: c,
            label: CLEARANCE_LABELS[c],
          }))}
          value={filters.clearance}
          onChange={(e) => set("clearance", e.target.value)}
        />
        <Select
          label="Status"
          className="[&>label]:sr-only"
          placeholder="Active and inactive"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          value={filters.status}
          onChange={(e) => set("status", e.target.value)}
        />
        <Select
          label="Flagged"
          className="[&>label]:sr-only"
          placeholder="Flagged or not"
          options={[{ value: "true", label: "Flagged for review" }]}
          value={filters.flagged}
          onChange={(e) => set("flagged", e.target.value)}
        />
      </div>
      {people.isPending ? (
        <Spinner />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Role</th>
                <th className={th}>Clearance</th>
                <th className={`${th} text-right`}>Hours</th>
                <th className={th}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {people.data?.items.map((p) => (
                <tr key={p._id} className="hover:bg-ink-50">
                  <td className={td}>
                    <Link
                      href={`/admin/people/${p._id}`}
                      className="font-semibold text-ink-900 hover:text-brand-800"
                    >
                      {p.firstName} {p.lastName}
                    </Link>
                    <div className="text-[13px] text-ink-500">{p.email}</div>
                    <div className="mt-1 flex gap-1">
                      {p.status === "inactive" ? (
                        <Badge tone="danger">Inactive</Badge>
                      ) : null}
                      {p.flaggedForReviewAt ? (
                        <Badge tone="warning">Review</Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className={td}>{ROLE_LABELS[p.role]}</td>
                  <td className={td}>
                    <ClearanceBadge status={p.clearanceStatus} />
                    {p.clearanceExpiresOn ? (
                      <div className="mt-1 text-[12px] text-ink-500">
                        to {formatShortDate(p.clearanceExpiresOn)}
                      </div>
                    ) : null}
                  </td>
                  <td className={`${td} text-right tabular`}>
                    {formatHours(p.hours)}
                  </td>
                  <td className={td}>{formatShortDate(p.createdAt)}</td>
                </tr>
              ))}
              {!people.data?.items.length ? (
                <tr>
                  <td className={td} colSpan={5}>
                    No one matches these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </Table>
          {people.data ? (
            <Pagination
              page={people.data.page}
              total={people.data.total}
              pageSize={people.data.pageSize}
              onPage={(p) => set("page", String(p))}
            />
          ) : null}
        </>
      )}
      <InviteDialog open={inviting} onClose={() => setInviting(false)} />
    </div>
  );
}
