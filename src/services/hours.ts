import { Types } from "mongoose";
import CertificateDAO from "@/db/actions/certificate";
import EventDAO from "@/db/actions/event";
import HoursLedgerDAO from "@/db/actions/hoursLedger";
import ShiftDAO from "@/db/actions/shift";
import SignupDAO from "@/db/actions/signup";
import UserDAO from "@/db/actions/user";
import { PROGRAM_AREA_LABELS } from "@/constants/labels";
import { addDays, formatHours, formatMonthYear } from "@/lib/dates";
import AuditService from "@/services/audit";
import CertificateService from "@/services/certificate";
import type { HoursSummary, LedgerEntryWithEvent, Report } from "@/types/api";
import type { Actor } from "@/types/auth";
import { NotFoundError } from "@/types/exceptions";
import type { HoursLedgerEntry } from "@/types/signup";
import { sameId } from "@/utils/authorization";
import ERRORS from "@/utils/errorMessages";
import {
  adjustHoursSchema,
  ReportKind,
  reportFiltersSchema,
} from "@/utils/validation/admin";

/** The append-only ledger, and the reports that read from it. */
export default class HoursService {
  static post(entry: HoursLedgerEntry): Promise<unknown> {
    return HoursLedgerDAO.create(entry);
  }

  static async withEvents(
    entries: Awaited<ReturnType<typeof HoursLedgerDAO.findByVolunteer>>
  ): Promise<LedgerEntryWithEvent[]> {
    const events = await EventDAO.findByIds([
      ...new Set(entries.map((e) => e.eventId.toString())),
    ]);
    return entries.map((entry) => {
      const event = events.find((e) => sameId(e._id, entry.eventId));
      return {
        ...entry,
        eventTitle: event?.title ?? "Event",
        eventDate: event?.eventDate ?? entry.approvedAt,
      };
    });
  }

  static async summary(
    volunteerId: string | Types.ObjectId
  ): Promise<HoursSummary> {
    const [entries, total, certificates] = await Promise.all([
      HoursLedgerDAO.findByVolunteer(volunteerId),
      HoursLedgerDAO.totalForVolunteer(volunteerId),
      CertificateDAO.findByVolunteer(volunteerId),
    ]);
    return {
      total,
      entries: await HoursService.withEvents(entries),
      certificates,
    };
  }

  /**
   * Admin correction. Written as a reversing row that points at the original
   * approval; any certificate describing those hours is revoked and reissued.
   */
  static async adjust(
    admin: Actor,
    input: unknown
  ): Promise<{ total: number }> {
    const data = adjustHoursSchema.parse(input);
    const [volunteer, event] = await Promise.all([
      UserDAO.findById(data.volunteerId),
      EventDAO.findById(data.eventId),
    ]);
    if (!volunteer) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    if (!event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);

    const existing = await HoursLedgerDAO.findByVolunteerAndEvent(
      volunteer._id,
      event._id
    );
    const before = existing.reduce((sum, e) => sum + e.hours, 0);
    const entry = await HoursLedgerDAO.create({
      volunteerId: volunteer._id,
      eventId: event._id,
      signupId: existing[0]?.signupId ?? null,
      hours: data.hours,
      approvedBy: new Types.ObjectId(admin.id),
      approvedAt: new Date(),
      reason: data.reason,
      reversalOf: existing[0]?._id ?? null,
    });
    await AuditService.record(admin, "hours.adjusted", "ledger", entry._id, {
      before: { eventHours: before },
      after: {
        eventHours: before + data.hours,
        delta: data.hours,
        reason: data.reason,
      },
    });
    await CertificateService.reissueAfterAdjustment(volunteer, event, admin);
    return { total: await HoursLedgerDAO.totalForVolunteer(volunteer._id) };
  }

  static async report(kind: ReportKind, input: unknown): Promise<Report> {
    const { from: start, to: end } = reportFiltersSchema.parse(input);
    const base = { kind, from: start, to: end };

    switch (kind) {
      case "hours": {
        const rows = await HoursLedgerDAO.hoursByEvent(start, end);
        const byMonth = new Map<string, number>();
        const byProgram = new Map<string, number>();
        for (const row of rows) {
          const month = formatMonthYear(row.eventDate);
          byMonth.set(month, (byMonth.get(month) ?? 0) + row.hours);
          const program = PROGRAM_AREA_LABELS[row.programArea];
          byProgram.set(program, (byProgram.get(program) ?? 0) + row.hours);
        }
        const total = rows.reduce((sum, r) => sum + r.hours, 0);
        return {
          ...base,
          columns: [
            { key: "eventDate", header: "Date" },
            { key: "eventTitle", header: "Event" },
            { key: "programArea", header: "Program area" },
            { key: "volunteers", header: "Volunteers" },
            { key: "hours", header: "Hours" },
          ],
          rows: rows.map((r) => ({
            eventDate: r.eventDate,
            eventTitle: r.eventTitle,
            programArea: PROGRAM_AREA_LABELS[r.programArea],
            volunteers: r.volunteers,
            hours: r.hours,
          })),
          summary: [
            { label: "Total hours", value: formatHours(total) },
            { label: "Events", value: String(rows.length) },
            ...[...byProgram].map(([program, hours]) => ({
              label: program,
              value: formatHours(hours),
            })),
            ...[...byMonth].map(([month, hours]) => ({
              label: month,
              value: formatHours(hours),
            })),
          ],
        };
      }
      case "volunteers": {
        const [served, active, newInPeriod, repeat] = await Promise.all([
          HoursLedgerDAO.hoursByVolunteer(start, end),
          UserDAO.count({ role: "volunteer", status: "active" }),
          UserDAO.count({
            role: "volunteer",
            createdAt: { $gte: start, $lt: end },
          }),
          SignupDAO.countRepeatVolunteers(addDays(new Date(), -90), 2),
        ]);
        const users = await UserDAO.findSummaries(
          served.map((s) => s.volunteerId)
        );
        return {
          ...base,
          columns: [
            { key: "name", header: "Volunteer" },
            { key: "email", header: "Email" },
            { key: "events", header: "Events" },
            { key: "hours", header: "Hours" },
          ],
          rows: served.map((s) => {
            const user = users.find((u) => sameId(u._id, s.volunteerId));
            return {
              name: user ? `${user.firstName} ${user.lastName}` : "Unknown",
              email: user?.email ?? "",
              events: s.events,
              hours: s.hours,
            };
          }),
          summary: [
            { label: "Active volunteers", value: String(active) },
            { label: "Served in period", value: String(served.length) },
            { label: "Joined in period", value: String(newInPeriod) },
            { label: "Repeat (2+ events, 90 days)", value: String(repeat) },
          ],
        };
      }
      case "fill":
      case "no_shows": {
        const fill = kind === "fill";
        const events = await EventDAO.findAll({
          status: { $in: fill ? ["published", "completed"] : ["completed"] },
          eventDate: { $gte: start, $lt: end },
        });
        const [counts, shifts] = await Promise.all([
          SignupDAO.countByEvents(
            events.map((e) => e._id),
            ["confirmed", "attended", "no_show"]
          ),
          ShiftDAO.findByEvents(events.map((e) => e._id)),
        ]);
        const stats = events.map((event) => {
          const c = counts.get(event._id.toString()) ?? {};
          return {
            event,
            capacity: shifts
              .filter((s) => sameId(s.eventId, event._id))
              .reduce((sum, s) => sum + s.capacity, 0),
            filled: (c.confirmed ?? 0) + (c.attended ?? 0) + (c.no_show ?? 0),
            attended: c.attended ?? 0,
            noShows: c.no_show ?? 0,
          };
        });
        const pct = (part: number, whole: number) =>
          whole ? Math.round((part / whole) * 100) : 0;
        const sum = (pick: (s: (typeof stats)[number]) => number) =>
          stats.reduce((acc, s) => acc + pick(s), 0);
        const overall = fill
          ? pct(
              sum((s) => s.filled),
              sum((s) => s.capacity)
            )
          : pct(
              sum((s) => s.noShows),
              sum((s) => s.attended + s.noShows)
            );

        return {
          ...base,
          columns: fill
            ? [
                { key: "eventDate", header: "Date" },
                { key: "eventTitle", header: "Event" },
                { key: "capacity", header: "Capacity" },
                { key: "filled", header: "Filled" },
                { key: "fillRate", header: "Fill rate %" },
              ]
            : [
                { key: "eventDate", header: "Date" },
                { key: "eventTitle", header: "Event" },
                { key: "attended", header: "Attended" },
                { key: "noShows", header: "No-shows" },
                { key: "noShowRate", header: "No-show rate %" },
              ],
          rows: stats.map((s): Report["rows"][number] =>
            fill
              ? {
                  eventDate: s.event.eventDate,
                  eventTitle: s.event.title,
                  capacity: s.capacity,
                  filled: s.filled,
                  fillRate: pct(s.filled, s.capacity),
                }
              : {
                  eventDate: s.event.eventDate,
                  eventTitle: s.event.title,
                  attended: s.attended,
                  noShows: s.noShows,
                  noShowRate: pct(s.noShows, s.attended + s.noShows),
                }
          ),
          summary: [
            {
              label: fill ? "Overall fill rate" : "Overall no-show rate",
              value: `${overall}%`,
            },
            { label: "Events", value: String(stats.length) },
          ],
        };
      }
    }
  }
}
