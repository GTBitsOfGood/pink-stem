import { Types } from "mongoose";
import EventDAO from "@/db/actions/event";
import ShiftDAO from "@/db/actions/shift";
import SignupDAO from "@/db/actions/signup";
import UserDAO from "@/db/actions/user";
import MessageThreadDAO from "@/db/actions/messageThread";
import MessageDAO from "@/db/actions/message";
import NotificationLogDAO from "@/db/actions/notificationLog";
import {
  JOB_LOCK_TTL_MS,
  LOW_FILL_ALERT_HOURS,
  REMINDER_HOURS,
  ROSTER_ADMIN_ESCALATION_DAYS,
  ROSTER_NUDGE_HOURS,
} from "@/constants/limits";
import { addHours, toDateInput } from "@/lib/dates";
import { addCounts, emptyCounts } from "@/lib/sendCounts";
import { appUrl } from "@/lib/urls";
import ClearanceService from "@/services/clearance";
import EventUpdateService from "@/services/eventUpdate";
import MessageService from "@/services/message";
import NotificationService from "@/services/notification";
import ScreeningService from "@/services/screening";
import SignupService from "@/services/signup";
import type { Doc } from "@/types/models";
import type { SendCounts } from "@/types/notification";
import type { Signup } from "@/types/signup";
import { sameId } from "@/utils/authorization";

/**
 * Every job reports the same shape. Email jobs count emails; jobs that send
 * none count records: `sent` for each one acted on, `skipped` for each one
 * looked at and left alone, `failed` for each one that could not be handled.
 */
type JobResult = ({ ok: true } & SendCounts) | { ok: false; error: string };

const JOB_LOCK_KEY = "jobs:run:lock";

/**
 * Everything time-driven. Each job is idempotent (see NotificationLog), so
 * the runner can fire hourly and a late or repeated run is harmless.
 */
export default class JobService {
  /** Runs every job unless an overlapping run holds the lock. */
  static async runExclusive(): Promise<
    Record<string, JobResult> | { skipped: true }
  > {
    const lock = await NotificationLogDAO.acquireLock(
      JOB_LOCK_KEY,
      JOB_LOCK_TTL_MS
    );
    if (!lock) return { skipped: true };
    try {
      return await JobService.runAll();
    } finally {
      await NotificationLogDAO.releaseLock(JOB_LOCK_KEY, lock);
    }
  }

  static async runAll(): Promise<Record<string, JobResult>> {
    const jobs: Record<string, () => Promise<SendCounts>> = {
      // Repair counters before the jobs that read them.
      shiftCounters: JobService.reconcileShiftCounters,
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
      // Last, so a slow registry download never holds up the emails.
      screening: ScreeningService.runDue,
    };
    const results: Record<string, JobResult> = {};
    for (const [name, job] of Object.entries(jobs)) {
      try {
        results[name] = { ok: true, ...(await job()) };
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

  /** Repairs drifted shift counters: sent = corrected, failed = drifted but not corrected. */
  static async reconcileShiftCounters(): Promise<SendCounts> {
    const drift = await SignupService.reconcileCounters({ correct: true });
    const corrected = drift.filter((d) => d.corrected).length;
    return { sent: corrected, skipped: 0, failed: drift.length - corrected };
  }

  /**
   * 72h and 24h reminders to confirmed volunteers, each sent once. Looks up
   * every sign-up, volunteer and the org settings once for the whole run.
   */
  static async sendReminders(): Promise<SendCounts> {
    const now = new Date();
    const counts = emptyCounts();
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
    const shiftsByWindow = await Promise.all(
      windows.map((w) => ShiftDAO.findStartingBetween(w.from, w.to))
    );
    const shifts = shiftsByWindow.flat();
    if (!shifts.length) return counts;

    const [events, signups, org] = await Promise.all([
      EventDAO.findByIds([...new Set(shifts.map((s) => s.eventId.toString()))]),
      SignupDAO.find({
        shiftId: { $in: shifts.map((s) => s._id) },
        status: "confirmed",
      }),
      NotificationService.org(),
    ]);
    const users = await UserDAO.findByIds([
      ...new Set(signups.map((s) => s.volunteerId.toString())),
    ]);
    const userById = new Map(users.map((u) => [u._id.toString(), u]));
    const signupsByShift = new Map<string, Doc<Signup>[]>();
    for (const signup of signups) {
      const id = signup.shiftId.toString();
      signupsByShift.set(id, [...(signupsByShift.get(id) ?? []), signup]);
    }

    for (const [i, window] of windows.entries()) {
      for (const shift of shiftsByWindow[i]) {
        const event = events.find((e) => sameId(e._id, shift.eventId));
        if (!event || event.status !== "published") continue;
        const details = NotificationService.eventDetails(event, shift);
        for (const signup of signupsByShift.get(shift._id.toString()) ?? []) {
          const user = userById.get(signup.volunteerId.toString());
          if (!user) {
            counts.skipped += 1;
            continue;
          }
          const outcome = await NotificationService.send(
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
          counts[outcome] += 1;
        }
      }
    }
    return counts;
  }

  /** Shifts under minimum staffing at the 72-hour mark alert their organizer. */
  static async lowFillAlerts(): Promise<SendCounts> {
    const now = new Date();
    const shifts = (
      await ShiftDAO.findStartingBetween(
        addHours(now, LOW_FILL_ALERT_HOURS - 24),
        addHours(now, LOW_FILL_ALERT_HOURS)
      )
    ).filter((s) => s.filledCount < s.minStaffing);
    const counts = emptyCounts();
    if (!shifts.length) return counts;
    const events = await EventDAO.findByIds([
      ...new Set(shifts.map((s) => s.eventId.toString())),
    ]);
    const org = await NotificationService.org();
    for (const event of events) {
      if (event.status !== "published") continue;
      const organizer = await UserDAO.findById(event.organizerId);
      if (!organizer) {
        counts.skipped += 1;
        continue;
      }
      const low = shifts.filter((s) => sameId(s.eventId, event._id));
      const outcome = await NotificationService.send(
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
      counts[outcome] += 1;
    }
    return counts;
  }

  /** Unapproved rosters: organizer at 24h and 72h after the last shift, admins at 7 days. */
  static async rosterNudges(): Promise<SendCounts> {
    const now = new Date();
    const events = await EventDAO.findAll({
      status: "published",
      eventDate: { $lt: now },
    });
    const counts = emptyCounts();
    if (!events.length) return counts;
    const shifts = await ShiftDAO.findByEvents(events.map((e) => e._id));
    const org = await NotificationService.org();

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
        const outcome = await NotificationService.send(
          organizer,
          NotificationService.templates.rosterNudge(org, {
            name: organizer.firstName,
            eventTitle: event.title,
            url,
            hoursSince,
          }),
          { dedupeKey: `roster-nudge:${stage}:${event._id}` }
        );
        counts[outcome] += 1;
      }
      if (hoursSince >= ROSTER_ADMIN_ESCALATION_DAYS * 24) {
        const escalated = await NotificationService.toAdmins(
          (o, admin) =>
            NotificationService.templates.rosterEscalation(o, {
              name: admin.firstName,
              eventTitle: event.title,
              organizerName: organizer
                ? `${organizer.firstName} ${organizer.lastName}`
                : "a former organizer",
              url,
            }),
          `roster-escalation:${event._id}`,
          org
        );
        addCounts(counts, escalated);
      }
    }
    return counts;
  }

  /** Once a day per organizer: roster changes, low fill, unapproved rosters, unanswered messages. */
  static async organizerDigest(): Promise<SendCounts> {
    const now = new Date();
    const dayAgo = addHours(now, -24);
    const staff = [
      ...(await UserDAO.listByRole("organizer")),
      ...(await UserDAO.listByRole("admin")),
    ];
    const org = await NotificationService.org();
    const counts = emptyCounts();

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
            ...left.map((s) =>
              s.absence
                ? `Absence reported for ${titleOf(s.eventId)}`
                : `Cancellation on ${titleOf(s.eventId)}`
            ),
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

      const outcome = await NotificationService.send(
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
      counts[outcome] += 1;
    }
    return counts;
  }
}
