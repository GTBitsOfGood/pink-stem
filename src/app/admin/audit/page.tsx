"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useAuditLog } from "@/components/hooks/useAdmin";
import { Input, Select } from "@/components/ui/Field";
import {
  PageHeader,
  Pagination,
  Spinner,
  Table,
  td,
  th,
} from "@/components/ui/Primitives";
import { AUDIT_ACTION_LABELS } from "@/constants/labels";
import AdminHTTPClient from "@/http/adminHTTPClient";
import { formatDateTime } from "@/lib/dates";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/types/audit";

export default function AuditPage() {
  const [filters, setFilters] = useState({
    action: "",
    entityType: "",
    from: "",
    to: "",
    page: "1",
  });
  const audit = useAuditLog(filters);
  const set = (key: keyof typeof filters, value: string) =>
    setFilters({
      ...filters,
      [key]: value,
      page: key === "page" ? value : "1",
    });

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Append-only record of every consequential action: who, what, before, after, when, and from where."
        action={
          <a
            href={AdminHTTPClient.auditCsvUrl(filters)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-800 hover:bg-ink-50"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
        }
      />
      <div className="mb-4 grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-card md:grid-cols-4">
        <Select
          label="Action"
          className="[&>label]:sr-only"
          placeholder="Any action"
          options={AUDIT_ACTIONS.map((a) => ({
            value: a,
            label: AUDIT_ACTION_LABELS[a],
          }))}
          value={filters.action}
          onChange={(e) => set("action", e.target.value)}
        />
        <Select
          label="Entity"
          className="[&>label]:sr-only"
          placeholder="Any entity"
          options={AUDIT_ENTITY_TYPES.map((t) => ({ value: t, label: t }))}
          value={filters.entityType}
          onChange={(e) => set("entityType", e.target.value)}
        />
        <Input
          label="From"
          className="[&>label]:sr-only"
          type="date"
          value={filters.from}
          onChange={(e) => set("from", e.target.value)}
        />
        <Input
          label="To"
          className="[&>label]:sr-only"
          type="date"
          value={filters.to}
          onChange={(e) => set("to", e.target.value)}
        />
      </div>
      {audit.isPending ? (
        <Spinner />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th className={th}>When</th>
                <th className={th}>Actor</th>
                <th className={th}>Action</th>
                <th className={th}>Entity</th>
                <th className={th}>Before</th>
                <th className={th}>After</th>
                <th className={th}>IP</th>
              </tr>
            </thead>
            <tbody>
              {audit.data?.items.map((row) => (
                <tr key={row._id}>
                  <td className={`${td} whitespace-nowrap`}>
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className={td}>{row.actorName}</td>
                  <td className={td}>{AUDIT_ACTION_LABELS[row.action]}</td>
                  <td className={`${td} font-mono text-xs`}>
                    {row.entityType} {String(row.entityId).slice(-6)}
                  </td>
                  <td
                    className={`${td} max-w-48 break-all font-mono text-xs text-ink-500`}
                  >
                    {row.before ? JSON.stringify(row.before) : ""}
                  </td>
                  <td
                    className={`${td} max-w-48 break-all font-mono text-xs text-ink-500`}
                  >
                    {row.after ? JSON.stringify(row.after) : ""}
                  </td>
                  <td className={`${td} font-mono text-xs text-ink-500`}>
                    {row.ipAddress}
                  </td>
                </tr>
              ))}
              {!audit.data?.items.length ? (
                <tr>
                  <td className={td} colSpan={7}>
                    No entries match.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </Table>
          {audit.data ? (
            <Pagination
              page={audit.data.page}
              total={audit.data.total}
              pageSize={audit.data.pageSize}
              onPage={(p) => set("page", String(p))}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
