import { Types } from "mongoose";
import EventDAO from "@/db/actions/event";
import ShiftDAO from "@/db/actions/shift";
import SignupDAO from "@/db/actions/signup";
import UserDAO from "@/db/actions/user";
import MessageThreadDAO from "@/db/actions/messageThread";
import MessageDAO from "@/db/actions/message";
import {
  LOW_FILL_ALERT_HOURS,
  REMINDER_HOURS,
  ROSTER_ADMIN_ESCALATION_DAYS,
  ROSTER_NUDGE_HOURS,
} from "@/constants/limits";
import { addHours, toDateInput } from "@/lib/dates";
import { appUrl } from "@/lib/urls";
import ClearanceService from "@/services/clearance";
import EventUpdateService from "@/services/eventUpdate";
import MessageService from "@/services/message";
import NotificationService from "@/services/notification";
import SignupService from "@/services/signup";
import { sameId } from "@/utils/authorization";

type JobResult = { ok: true; count: number } | { ok: false; error: string };

/**
 * Everything time-driven. Each job is idempotent (see NotificationLog), so
 * the runner can fire hourly and a late or repeated run is harmless.
 */
export default class JobService {
  static async runAll(): Promise<Record<string, JobResult>> {
    const jobs: Record<string, () => Promise<number>> = {
      reminders: JobService.sendReminders,
      lowFill: JobService.lowFillAlerts,
      rosterNudges: JobService.rosterNudges,
      clearanceWarnings: ClearanceService.warnExpiring,
      clearanceExpiry: ClearanceService.expireLapsed,
      holdExpiry: SignupService.expireHolds,
      noteDigest: EventUpdateService.sendNoteDigest,
      messageDigest: MessageService.sendDigests,
      staleThreads: MessageService.closeStale,
      organizerDigest: JobService.organizerDigest,
    };
    const results: Record<string, JobResult> = {};
    for (const [name, job] of Object.entries(jobs)) {
      try {
        results[name] = { ok: true, count: await job() };
      } catch (error) {
        results[name] = {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
        console.error(`[jobs] ${name} failed`, error);
      }
    }
    return results;
  }

  /** 72h and 24h reminders to confirmed volunteers, each sent once. */
  static async sendReminders(): Promise<number> {
    const now = new Date();
    let sent = 0;
    const windows = [
      {
        hours: REMINDER_HOURS[0],
        from: addHours(now, REMINDER_HOURS[1]),
        to: addHours(now, REMINDER_HOURS[0]),
      },
      {
        hours: REMINDER_HOURS[1],
        from: now,
        to: addHours(now, REMINDER_HOURS[1]),
      },
    ];
    for (const window of windows) {
      const shifts = await ShiftDAO.findStartingBetween(window.from, window.to);
      if (!shifts.length) continue;
      const events = await EventDAO.findByIds([
        ...new Set(shifts.map((s) => s.eventId.toString())),
      ]);
      for (const shift of shifts) {
        const event = events.find((e) => sameId(e._id, shift.eventId));
        if (!event || event.status !== "published") continue;
        const details = NotificationService.eventDetails(event, shift);
        const signups = await SignupDAO.find({
          shiftId: shift._id,
          status: "confirmed",
        });
        for (const signup of signups) {
          const user = await UserDAO.findById(signup.volunteerId);
          if (!user) continue;
          const org = await NotificationService.org();
          const delivered = await NotificationService.send(
            user,
            NotificationService.templates.reminder(org, {
              name: user.firstName,
              event: details,
              role: shift.roleName,
              hoursOut: window.hours,
            }),
            {
              category: "reminders",
              dedupeKey: `reminder:${window.hours}:${signup._id}`,
            }
          );
          if (delivered) sent += 1;
        }
      }
    }
    return sent;
  }

  /** Shifts under minimum staffing at the 72-hour mark alert their organizer. */
  static async lowFillAlerts(): Promise<number> {
    const now = new Date();
    const shifts = (
      await ShiftDAO.findStartingBetween(
        addHours(now, LOW_FILL_ALERT_HOURS - 24),
        addHours(now, LOW_FILL_ALERT_HOURS)
      )
    ).filter((s) => s.filledCount < s.minStaffing);
    if (!shifts.length) return 0;
    const events = await EventDAO.findByIds([
      ...new Set(shifts.map((s) => s.eventId.toString())),
    ]);
    const org = await NotificationService.org();
    let sent = 0;
    for (const event of events) {
      if (event.status !== "published") continue;
      const organizer = await UserDAO.findById(event.organizerId);
      if (!organizer) continue;
      const low = shifts.filter((s) => sameId(s.eventId, event._id));
      const delivered = await NotificationService.send(
        organizer,
        NotificationService.templates.lowFill(org, {
          name: organizer.firstName,
          eventTitle: event.title,
          url: appUrl(`/organizer/events/${event._id}`),
          shifts: low.map((s) => ({
            role: s.roleName,
            filled: s.filledCount,
            min: s.minStaffing,
          })),
        }),
        {
          dedupeKey: `low-fill:${event._id}:${low.map((s) => s._id).join(",")}`,
        }
      );
      if (delivered) sent += 1;
    }
    return sent;
  }

  /** Unapproved rosters: organizer at 24h and 72h after the last shift, admins at 7 days. */
  static async rosterNudges(): Promise<number> {
    const now = new Date();
    const events = await EventDAO.findAll({
      status: "published",
      eventDate: { $lt: now },
    });
    if (!events.length) return 0;
    const shifts = await ShiftDAO.findByEvents(events.map((e) => e._id));
    const org = await NotificationService.org();
    let sent = 0;

    for (const event of events) {
      const ends = shifts
        .filter((s) => sameId(s.eventId, event._id))
        .map((s) => s.endsAt.getTime());
      if (!ends.length) continue;
      const hoursSince = Math.floor(
        (now.getTime() - Math.max(...ends)) / 3_600_000
      );
      if (hoursSince < ROSTER_NUDGE_HOURS[0]) continue;
      const organizer = await UserDAO.findById(event.organizerId);
      const url = appUrl(`/organizer/events/${event._id}/roster`);

      for (const stage of ROSTER_NUDGE_HOURS) {
        if (hoursSince < stage || !organizer) continue;
        const delivered = await NotificationService.send(
          organizer,
          NotificationService.templates.rosterNudge(org, {
            name: organizer.firstName,
            eventTitle: event.title,
            url,
            hoursSince,
          }),
          { dedupeKey: `roster-nudge:${stage}:${event._id}` }
        );
        if (delivered) sent += 1;
      }
      if (hoursSince >= ROSTER_ADMIN_ESCALATION_DAYS * 24) {
        await NotificationService.toAdmins(
          (o, admin) =>
            NotificationService.templates.rosterEscalation(o, {
              name: admin.firstName,
              eventTitle: event.title,
              organizerName: organizer
                ? `${organizer.firstName} ${organizer.lastName}`
                : "a former organizer",
              url,
            }),
          `roster-escalation:${event._id}`
        );
      }
    }
    return sent;
  }

  /** Once a day per organizer: roster changes, low fill, unapproved rosters, unanswered messages. */
  static async organizerDigest(): Promise<number> {
    const now = new Date();
    const dayAgo = addHours(now, -24);
    const staff = [
      ...(await UserDAO.listByRole("organizer")),
      ...(await UserDAO.listByRole("admin")),
    ];
    const org = await NotificationService.org();
    let sent = 0;

    for (const organizer of staff) {
      const events = await EventDAO.findAll({
        organizerId: organizer._id,
        status: "published",
      });
      if (!events.length) continue;
      const eventIds = events.map((e) => e._id);
      const [shifts, signups, threads] = await Promise.all([
        ShiftDAO.findByEvents(eventIds),
        SignupDAO.find({
          eventId: { $in: eventIds },
          $or: [
            { signedUpAt: { $gte: dayAgo } },
            { cancelledAt: { $gte: dayAgo } },
          ],
        }),
        MessageThreadDAO.findAll({
          organizerId: organizer._id,
          status: "open",
          lastMessageAt: { $lt: addHours(now, -48) },
        }),
      ]);
      const titleOf = (id: Types.ObjectId) =>
        events.find((e) => sameId(e._id, id))?.title ?? "Event";
      const sections: { heading: string; lines: string[] }[] = [];

      const joined = signups.filter(
        (s) => s.signedUpAt >= dayAgo && s.status !== "cancelled"
      );
      const left = signups.filter(
        (s) => s.cancelledAt && s.cancelledAt >= dayAgo
      );
      if (joined.length || left.length) {
        sections.push({
          heading: "Roster changes in the last 24 hours",
          lines: [
            ...joined.map((s) => `New sign-up for ${titleOf(s.eventId)}`),
            ...left.map((s) => `Cancellation on ${titleOf(s.eventId)}`),
          ],
        });
      }
      const lowFill = shifts.filter(
        (s) =>
          s.startsAt > now &&
          s.startsAt < addHours(now, LOW_FILL_ALERT_HOURS) &&
          s.filledCount < s.minStaffing
      );
      if (lowFill.length) {
        sections.push({
          heading: "Below minimum staffing this week",
          lines: lowFill.map(
            (s) =>
              `${titleOf(s.eventId)} · ${s.roleName}: ${s.filledCount} of ${s.minStaffing}`
          ),
        });
      }
      const unapproved = events.filter((e) => e.eventDate < now);
      if (unapproved.length) {
        sections.push({
          heading: "Rosters waiting for approval",
          lines: unapproved.map((e) => e.title),
        });
      }
      const latest = await MessageDAO.latestByThreads(
        threads.map((t) => t._id)
      );
      const unanswered = threads.flatMap((thread) => {
        const message = latest.get(thread._id.toString());
        return message && sameId(message.senderId, thread.volunteerId)
          ? [`Unanswered question on ${titleOf(thread.eventId)}`]
          : [];
      });
      if (unanswered.length)
        sections.push({
          heading: "Messages older than 48 hours",
          lines: unanswered,
        });
      if (!sections.length) continue;

      const delivered = await NotificationService.send(
        organizer,
        NotificationService.templates.organizerDigest(org, {
          name: organizer.firstName,
          sections,
          url: appUrl("/organizer"),
        }),
        {
          category: "digests",
          dedupeKey: `organizer-digest:${organizer._id}:${toDateInput(now)}`,
        }
      );
      if (delivered) sent += 1;
    }
    return sent;
  }
}
