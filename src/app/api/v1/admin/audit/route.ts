import { NextRequest } from "next/server";
import { AUDIT_ACTION_LABELS } from "@/constants/labels";
import { toCsv } from "@/lib/csv";
import AdminService from "@/services/admin";
import { fileResponse, jsonNoStore, queryOf } from "@/utils/request";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth(
  async (req: NextRequest) => {
    const { format, ...filters } = queryOf(req);
    if (format !== "csv") return jsonNoStore(await AdminService.audit(filters));

    const { items } = await AdminService.audit(filters, { all: true });
    const csv = toCsv(items, [
      { header: "Time", value: (r) => r.createdAt },
      { header: "Actor", value: (r) => r.actorName },
      { header: "Action", value: (r) => AUDIT_ACTION_LABELS[r.action] },
      { header: "Entity type", value: (r) => r.entityType },
      { header: "Entity id", value: (r) => r.entityId },
      {
        header: "Before",
        value: (r) => (r.before == null ? "" : JSON.stringify(r.before)),
      },
      {
        header: "After",
        value: (r) => (r.after == null ? "" : JSON.stringify(r.after)),
      },
      { header: "IP", value: (r) => r.ipAddress },
    ]);
    return fileResponse(
      csv,
      "pink-stem-audit-log.csv",
      "text/csv; charset=utf-8"
    );
  },
  { roles: ["admin"] }
);
