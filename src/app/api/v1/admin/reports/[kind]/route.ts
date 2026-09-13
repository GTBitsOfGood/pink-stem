import { NextRequest } from "next/server";
import { z } from "zod";
import { toCsv } from "@/lib/csv";
import HoursService from "@/services/hours";
import { fileResponse, jsonNoStore, queryOf } from "@/utils/request";
import { REPORT_KINDS } from "@/utils/validation/admin";
import { withAuth } from "@/utils/withAuth";

export const GET = withAuth<{ kind: string }>(
  async (req: NextRequest, { params }) => {
    const kind = z.enum(REPORT_KINDS).parse(params.kind);
    const { format, ...filters } = queryOf(req);
    const report = await HoursService.report(kind, filters);
    if (format !== "csv") return jsonNoStore(report);

    const csv = toCsv(
      report.rows,
      report.columns.map((column) => ({
        header: column.header,
        value: (row) => row[column.key],
      }))
    );
    return fileResponse(
      csv,
      `pink-stem-${kind}-report.csv`,
      "text/csv; charset=utf-8"
    );
  },
  { roles: ["admin"] }
);
