import { Types } from "mongoose";
import EventDAO from "@/db/actions/event";
import EventUpdateDAO from "@/db/actions/eventUpdate";
import OrgSettingsDAO from "@/db/actions/orgSettings";
import ShiftDAO from "@/db/actions/shift";
import SignupDAO from "@/db/actions/signup";
import UserDAO from "@/db/actions/user";
import { addDays, formatHours, hoursBetween } from "@/lib/dates";
import { appUrl } from "@/lib/urls";
import AuditService from "@/services/audit";
import CertificateService from "@/services/certificate";
import HoursService from "@/services/hours";
import NotificationService from "@/services/notification";
import type { Actor } from "@/types/auth";
import {
  IllegalOperationError,
  InvalidArgumentsError,
  NotFoundError,
} from "@/types/exceptions";
import type { Doc } from "@/types/models";
import type { Signup } from "@/types/signup";
import { assertCanManageEvent, sameId } from "@/utils/authorization";
import ERRORS from "@/utils/errorMessages";
import { attendanceInputSchema } from "@/utils/validation/signup";

/**
 * Roster check-off and approval. Marks are saved one at a time so an
 * organizer on a weak signal never loses work; approval is the single action
 * that posts hours to the ledger and issues certificates.
 */
export default class AttendanceService {
  static async mark(
    actor: Actor,
    signupId: string,
    input: unknown
  ): Promise<Doc<Signup>> {
    const data = attendanceInputSchema.parse(input);
    const signup = await SignupDAO.findById(signupId);
    if (!signup) throw new NotFoundError(ERRORS.SIGNUP.NOT_FOUND);
    const [event, shift] = await Promise.all([
      EventDAO.findById(signup.eventId),
      ShiftDAO.findById(signup.shiftId),
    ]);
    if (!event || !shift) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    assertCanManageEvent(actor, event);
    if (event.status !== "published")
      throw new IllegalOperationError(ERRORS.ROSTER.ALREADY_APPROVED);
    if (signup.status !== "confirmed")
      throw new IllegalOperationError(ERRORS.SIGNUP.NOT_ON_ROSTER);

    const scheduled = hoursBetween(shift.startsAt, shift.endsAt);
    const hours = data.status === "attended" ? (data.hours ?? scheduled) : 0;
    if (
      data.status === "attended" &&
      hours !== scheduled &&
      !data.adjustmentReason
    ) {
      throw new InvalidArgumentsError(ERRORS.SIGNUP.ADJUSTMENT_REASON);
    }

    return (await SignupDAO.updateById(signup._id, {
      attendance: {
        status: data.status,
        hours,
        adjustmentReason:
          hours !== scheduled ? data.adjustmentReason : undefined,
        markedBy: new Types.ObjectId(actor.id),
        markedAt: new Date(),
      },
    })) as Doc<Signup>;
  }

  static async approveRoster(
    actor: Actor,
    eventId: string
  ): Promise<{ approved: number; totalHours: number }> {
    const event = await EventDAO.findById(eventId);
    if (!event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    assertCanManageEvent(actor, event);
    if (event.status !== "published")
      throw new IllegalOperationError(ERRORS.ROSTER.ALREADY_APPROVED);

    const [shifts, signups, settings] = await Promise.all([
      ShiftDAO.findByEvent(event._id),
      SignupDAO.findByEvent(event._id, ["pending", "confirmed", "waitlisted"]),
      OrgSettingsDAO.get(),
    ]);
    const now = new Date();
    const earliestStart = Math.min(...shifts.map((s) => s.startsAt.getTime()));
    if (now.getTime() < earliestStart)
      throw new IllegalOperationError(ERRORS.ROSTER.NOT_STARTED);

    const confirmed = signups.filter((s) => s.status === "confirmed");
    if (confirmed.some((s) => !s.attendance))
      throw new IllegalOperationError(ERRORS.ROSTER.UNMARKED);

    const approver = new Types.ObjectId(actor.id);
    let totalHours = 0;

    for (const signup of confirmed) {
      const attendance = signup.attendance!;
      const attended = attendance.status === "attended";
      await SignupDAO.updateById(signup._id, {
        status: attended ? "attended" : "no_show",
      });
      if (!attended) {
        await AttendanceService.reviewNoShows(
          actor,
          signup.volunteerId,
          settings.noShowThreshold,
          settings.noShowWindowDays
        );
        continue;
      }
      totalHours += attendance.hours;
      await HoursService.post({
        volunteerId: signup.volunteerId,
        eventId: event._id,
        signupId: signup._id,
        hours: attendance.hours,
        approvedBy: approver,
        approvedAt: now,
        reason: attendance.adjustmentReason,
      });
      const [volunteer, shift] = [
        await UserDAO.findById(signup.volunteerId),
        shifts.find((s) => sameId(s._id, signup.shiftId)),
      ];
      if (!volunteer || !shift) continue;
      await CertificateService.issueEventCertificate(
        volunteer,
        event,
        shift.roleName,
        attendance.hours,
        actor
      );
      const org = await NotificationService.org();
      await NotificationService.send(
        volunteer,
        NotificationService.templates.hoursApproved(org, {
          name: volunteer.firstName,
          event: NotificationService.eventDetails(event, shift),
          hours: formatHours(attendance.hours),
          certificateUrl: appUrl("/hours"),
        })
      );
    }

    // Whoever never reached confirmed is quietly closed out with the event.
    const leftovers = signups.filter((s) => s.status !== "confirmed");
    if (leftovers.length) {
      await SignupDAO.updateMany(
        { _id: { $in: leftovers.map((s) => s._id) } },
        {
          status: "cancelled",
          cancelledAt: now,
          cancellationReason: "Event completed",
        }
      );
    }

    await EventDAO.updateById(event._id, {
      status: "completed",
      completedAt: now,
    });
    await EventUpdateDAO.unpinForEvent(event._id);
    await AuditService.record(actor, "hours.approved", "event", event._id, {
      after: { volunteers: confirmed.length, totalHours },
    });
    return { approved: confirmed.length, totalHours };
  }

  /** Repeated no-shows flag the volunteer for review; nothing is blocked automatically. */
  private static async reviewNoShows(
    actor: Actor,
    volunteerId: Types.ObjectId,
    threshold: number,
    windowDays: number
  ): Promise<void> {
    const count = await SignupDAO.countNoShowsSince(
      volunteerId,
      addDays(new Date(), -windowDays)
    );
    if (count < threshold) return;
    const volunteer = await UserDAO.findById(volunteerId);
    if (!volunteer || volunteer.flaggedForReviewAt) return;
    await UserDAO.updateById(volunteerId, { flaggedForReviewAt: new Date() });
    await AuditService.record(
      actor,
      "user.flagged_for_review",
      "user",
      volunteerId,
      { after: { noShows: count } }
    );
    await NotificationService.toAdmins((org, admin) =>
      NotificationService.templates.noShowFlag(org, {
        name: admin.firstName,
        volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
        count,
        url: appUrl(`/admin/people/${volunteerId}`),
      })
    );
  }
}
