import { Types } from "mongoose";
import ClearanceDAO from "@/db/actions/clearance";
import EventDAO from "@/db/actions/event";
import OrgSettingsDAO from "@/db/actions/orgSettings";
import ShiftDAO from "@/db/actions/shift";
import SignupDAO from "@/db/actions/signup";
import UserDAO from "@/db/actions/user";
import { PENDING_REASON_LABELS } from "@/constants/labels";
import { LAPSED_SPOT_HOLD_DAYS } from "@/constants/limits";
import { isCleared } from "@/lib/clearance";
import { addDays, ageOn, isMinor } from "@/lib/dates";
import { buildIcs } from "@/lib/ics";
import { appUrl } from "@/lib/urls";
import AuditService from "@/services/audit";
import NotificationService from "@/services/notification";
import type { Roster, SignupWithContext } from "@/types/api";
import type { Actor } from "@/types/auth";
import type { Event, Shift } from "@/types/event";
import {
  ConflictError,
  ForbiddenError,
  IllegalOperationError,
  NotFoundError,
} from "@/types/exceptions";
import type { Doc } from "@/types/models";
import type { OrgSettings } from "@/types/settings";
import {
  ACTIVE_SIGNUP_STATUSES,
  LIVE_SIGNUP_STATUSES,
  PendingReason,
  Signup,
} from "@/types/signup";
import type { Clearance, SafeUser } from "@/types/user";
import { assertCanManageEvent, sameId } from "@/utils/authorization";
import ERRORS from "@/utils/errorMessages";
import {
  cancelSignupSchema,
  createSignupSchema,
} from "@/utils/validation/signup";

const HOUR = 3_600_000;

const isActive = (s: Pick<Signup, "status">) =>
  (ACTIVE_SIGNUP_STATUSES as readonly string[]).includes(s.status);
const isLive = (s: Pick<Signup, "status">) =>
  (LIVE_SIGNUP_STATUSES as readonly string[]).includes(s.status);

interface ReasonInput {
  user: Pick<
    SafeUser,
    "waiverVersionAccepted" | "dateOfBirth" | "guardianConsentAt"
  >;
  clearance: Pick<Clearance, "status" | "expiresOn"> | null;
  settings: Pick<OrgSettings, "waiverVersion">;
  event?: Pick<Event, "requiresClearance" | "requiresApproval">;
  approved?: boolean;
}

/**
 * The sign-up lifecycle. Capacity is enforced by an atomic conditional
 * update on the shift, so two volunteers racing for the last spot cannot
 * both be confirmed. Everything that can block confirmation is expressed as
 * a `PendingReason`, recomputed whenever something relevant changes.
 */
export default class SignupService {
  static pendingReasons({
    user,
    clearance,
    settings,
    event,
    approved,
  }: ReasonInput): PendingReason[] {
    const reasons: PendingReason[] = [];
    if ((user.waiverVersionAccepted ?? 0) < settings.waiverVersion)
      reasons.push("waiver");
    if (isMinor(user.dateOfBirth) && !user.guardianConsentAt)
      reasons.push("guardian_consent");
    if (event?.requiresClearance && !isCleared(clearance))
      reasons.push("clearance");
    if (event?.requiresApproval && !approved) reasons.push("approval");
    return reasons;
  }

  private static async reasonsFor(
    volunteerId: Types.ObjectId | string,
    event: Doc<Event>,
    approved: boolean
  ) {
    const [user, clearance, settings] = await Promise.all([
      UserDAO.findById(volunteerId),
      ClearanceDAO.findByUser(volunteerId),
      OrgSettingsDAO.get(),
    ]);
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    return {
      user,
      reasons: SignupService.pendingReasons({
        user,
        clearance,
        settings,
        event,
        approved,
      }),
    };
  }

  static async create(actor: Actor, input: unknown): Promise<Doc<Signup>> {
    const { shiftId, acknowledgeOverlap } = createSignupSchema.parse(input);
    const shift = await ShiftDAO.findById(shiftId);
    if (!shift) throw new NotFoundError(ERRORS.SHIFT.NOT_FOUND);
    const event = await EventDAO.findById(shift.eventId);
    if (!event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    if (event.status !== "published")
      throw new IllegalOperationError(ERRORS.EVENT.NOT_PUBLISHED);
    if (shift.startsAt <= new Date())
      throw new IllegalOperationError(ERRORS.SHIFT.IN_PAST);

    const { user, reasons } = await SignupService.reasonsFor(
      actor.id,
      event,
      false
    );
    if (
      event.minAge &&
      (!user.dateOfBirth ||
        ageOn(user.dateOfBirth, shift.startsAt) < event.minAge)
    ) {
      throw new ForbiddenError(ERRORS.SIGNUP.MIN_AGE);
    }

    const existing = await SignupDAO.findByShiftAndVolunteer(shiftId, actor.id);
    if (existing && existing.status !== "cancelled") {
      throw new ConflictError(ERRORS.SIGNUP.ALREADY_SIGNED_UP);
    }
    if (
      !acknowledgeOverlap &&
      (await SignupService.hasOverlap(actor.id, shift))
    ) {
      throw new ConflictError(ERRORS.SIGNUP.OVERLAP, "overlap");
    }

    const claimed = await ShiftDAO.claimSpot(shiftId);
    const status = claimed
      ? reasons.length
        ? "pending"
        : "confirmed"
      : "waitlisted";
    if (!claimed) await ShiftDAO.adjustWaitlist(shiftId, 1);

    const now = new Date();
    const fields = {
      status,
      pendingReasons: claimed ? reasons : [],
      signedUpAt: now,
      confirmedAt: status === "confirmed" ? now : null,
      approvedAt: null,
      approvedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      holdUntil: null,
      attendance: null,
    } as const;
    const signup = existing
      ? ((await SignupDAO.updateById(existing._id, {
          ...fields,
          $unset: { cancellationReason: 1 },
        })) as Doc<Signup>)
      : await SignupDAO.create({
          shiftId: shift._id,
          eventId: event._id,
          volunteerId: new Types.ObjectId(actor.id),
          ...fields,
        });

    await SignupService.notifyStatus(user, event, claimed ?? shift, signup);
    return signup;
  }

  /** A volunteer may legitimately cover two adjacent roles, so overlap warns rather than blocks. */
  private static async hasOverlap(
    volunteerId: string,
    shift: Doc<Shift>
  ): Promise<boolean> {
    const live = await SignupDAO.findByVolunteer(
      volunteerId,
      LIVE_SIGNUP_STATUSES
    );
    const others = live.filter((s) => !sameId(s.shiftId, shift._id));
    if (!others.length) return false;
    const shifts = await ShiftDAO.findByIds(others.map((s) => s.shiftId));
    return shifts.some(
      (s) => s.startsAt < shift.endsAt && s.endsAt > shift.startsAt
    );
  }

  static async cancel(
    actor: Actor,
    signupId: string,
    input: unknown
  ): Promise<Doc<Signup>> {
    const { reason } = cancelSignupSchema.parse(input ?? {});
    const signup = await SignupDAO.findById(signupId);
    if (!signup) throw new NotFoundError(ERRORS.SIGNUP.NOT_FOUND);
    const [shift, event, settings] = await Promise.all([
      ShiftDAO.findById(signup.shiftId),
      EventDAO.findById(signup.eventId),
      OrgSettingsDAO.get(),
    ]);
    if (!shift || !event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);

    const self = sameId(actor.id, signup.volunteerId);
    if (!self) assertCanManageEvent(actor, event);
    if (!isLive(signup))
      throw new IllegalOperationError(ERRORS.SIGNUP.NOT_CANCELLABLE);
    if (
      self &&
      shift.startsAt.getTime() - Date.now() <
        settings.cancellationCutoffHours * HOUR
    ) {
      throw new IllegalOperationError(ERRORS.SIGNUP.INSIDE_CUTOFF);
    }

    const released = await SignupService.release(
      signup,
      shift,
      event,
      settings,
      {
        by: new Types.ObjectId(actor.id),
        reason:
          reason ||
          (self ? "Cancelled by volunteer" : "Cancelled by organizer"),
      }
    );

    if (!self) {
      await AuditService.record(
        actor,
        "signup.cancelled_by_staff",
        "signup",
        signup._id,
        {
          before: { status: signup.status },
          after: { status: "cancelled", reason },
        }
      );
      const volunteer = await UserDAO.findById(signup.volunteerId);
      if (volunteer) {
        const org = await NotificationService.org();
        await NotificationService.send(
          volunteer,
          NotificationService.templates.signupReleased(org, {
            name: volunteer.firstName,
            event: NotificationService.eventDetails(event, shift),
            reason: `The organizer removed you from the ${shift.roleName} shift.${reason ? ` Reason: ${reason}` : ""}`,
          })
        );
      }
    }
    return released;
  }

  /** Cancels a live sign-up, frees its spot, and promotes the waitlist. */
  private static async release(
    signup: Doc<Signup>,
    shift: Doc<Shift>,
    event: Doc<Event>,
    settings: OrgSettings,
    options: { by: Types.ObjectId | null; reason: string; promote?: boolean }
  ): Promise<Doc<Signup>> {
    const updated = (await SignupDAO.updateById(signup._id, {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy: options.by,
      cancellationReason: options.reason,
      holdUntil: null,
    })) as Doc<Signup>;

    if (isActive(signup)) {
      await ShiftDAO.releaseSpot(shift._id);
      if (options.promote !== false)
        await SignupService.promoteWaitlist(shift._id, event, settings);
    } else if (signup.status === "waitlisted") {
      await ShiftDAO.adjustWaitlist(shift._id, -1);
    }
    return updated;
  }

  /**
   * Fills open spots from the waitlist in sign-up order. Inside the
   * configured window before start, promotion is left to the organizer.
   */
  static async promoteWaitlist(
    shiftId: Types.ObjectId,
    event: Doc<Event>,
    settings: OrgSettings,
    options: { ignoreCutoff?: boolean } = {}
  ): Promise<void> {
    for (;;) {
      const shift = await ShiftDAO.findById(shiftId);
      if (!shift || shift.filledCount >= shift.capacity) return;
      if (
        !options.ignoreCutoff &&
        shift.startsAt.getTime() - Date.now() <
          settings.autoPromoteCutoffHours * HOUR
      )
        return;
      const next = await SignupDAO.firstWaitlisted(shiftId);
      if (!next) return;
      if (!(await SignupService.promoteOne(next, shift, event))) return;
    }
  }

  private static async promoteOne(
    signup: Doc<Signup>,
    shift: Doc<Shift>,
    event: Doc<Event>
  ): Promise<boolean> {
    const claimed = await ShiftDAO.claimSpot(shift._id);
    if (!claimed) return false;
    const { user, reasons } = await SignupService.reasonsFor(
      signup.volunteerId,
      event,
      !!signup.approvedAt
    );
    const status = reasons.length ? "pending" : "confirmed";
    const updated = (await SignupDAO.updateById(signup._id, {
      status,
      pendingReasons: reasons,
      confirmedAt: status === "confirmed" ? new Date() : null,
    })) as Doc<Signup>;
    await ShiftDAO.adjustWaitlist(shift._id, -1);

    const org = await NotificationService.org();
    const details = NotificationService.eventDetails(event, claimed);
    await NotificationService.send(
      user,
      status === "confirmed"
        ? NotificationService.templates.waitlistPromoted(org, {
            name: user.firstName,
            event: details,
            role: claimed.roleName,
          })
        : NotificationService.templates.signupPending(org, {
            name: user.firstName,
            event: details,
            role: claimed.roleName,
            reasons: updated.pendingReasons.map(
              (r) => PENDING_REASON_LABELS[r]
            ),
          })
    );
    return true;
  }

  /** Organizer decides inside the auto-promotion window. */
  static async promote(actor: Actor, signupId: string): Promise<Doc<Signup>> {
    const signup = await SignupDAO.findById(signupId);
    if (!signup) throw new NotFoundError(ERRORS.SIGNUP.NOT_FOUND);
    const [shift, event] = await Promise.all([
      ShiftDAO.findById(signup.shiftId),
      EventDAO.findById(signup.eventId),
    ]);
    if (!shift || !event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    assertCanManageEvent(actor, event);
    if (signup.status !== "waitlisted")
      throw new IllegalOperationError(ERRORS.SIGNUP.NOT_CANCELLABLE);
    if (!(await SignupService.promoteOne(signup, shift, event))) {
      throw new ConflictError(ERRORS.SHIFT.CAPACITY_BELOW_FILLED);
    }
    return (await SignupDAO.findById(signupId)) as Doc<Signup>;
  }

  static async approve(actor: Actor, signupId: string): Promise<Doc<Signup>> {
    const signup = await SignupDAO.findById(signupId);
    if (!signup) throw new NotFoundError(ERRORS.SIGNUP.NOT_FOUND);
    const event = await EventDAO.findById(signup.eventId);
    if (!event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    assertCanManageEvent(actor, event);
    if (
      signup.status !== "pending" ||
      !signup.pendingReasons.includes("approval")
    ) {
      throw new IllegalOperationError(ERRORS.SIGNUP.NOT_APPROVABLE);
    }
    const approved = (await SignupDAO.updateById(signup._id, {
      approvedAt: new Date(),
      approvedBy: new Types.ObjectId(actor.id),
    })) as Doc<Signup>;
    return SignupService.reevaluate(approved);
  }

  /** Recomputes blockers for a pending sign-up and confirms it when none remain. */
  static async reevaluate(signup: Doc<Signup>): Promise<Doc<Signup>> {
    if (signup.status !== "pending") return signup;
    const [event, shift] = await Promise.all([
      EventDAO.findById(signup.eventId),
      ShiftDAO.findById(signup.shiftId),
    ]);
    if (!event || !shift || event.status !== "published") return signup;

    const { user, reasons } = await SignupService.reasonsFor(
      signup.volunteerId,
      event,
      !!signup.approvedAt
    );
    if (reasons.length) {
      return (await SignupDAO.updateById(signup._id, {
        pendingReasons: reasons,
      })) as Doc<Signup>;
    }
    const confirmed = (await SignupDAO.updateById(signup._id, {
      status: "confirmed",
      pendingReasons: [],
      confirmedAt: new Date(),
      holdUntil: null,
    })) as Doc<Signup>;
    await SignupService.notifyStatus(user, event, shift, confirmed);
    return confirmed;
  }

  static async reevaluateForVolunteer(
    volunteerId: string | Types.ObjectId
  ): Promise<void> {
    const pending = await SignupDAO.findByVolunteer(volunteerId, ["pending"]);
    for (const signup of pending) await SignupService.reevaluate(signup);
  }

  /**
   * Clearance lapsed between sign-up and event day: confirmed spots on
   * clearance-required events revert to pending and are held for 7 days.
   */
  static async lapseForVolunteer(
    volunteerId: string | Types.ObjectId,
    reasonText: string
  ): Promise<void> {
    const confirmed = await SignupDAO.findByVolunteer(volunteerId, [
      "confirmed",
    ]);
    if (!confirmed.length) return;
    const [events, shifts, user, org] = await Promise.all([
      EventDAO.findByIds(confirmed.map((s) => s.eventId)),
      ShiftDAO.findByIds(confirmed.map((s) => s.shiftId)),
      UserDAO.findById(volunteerId),
      NotificationService.org(),
    ]);
    if (!user) return;
    const now = new Date();

    for (const signup of confirmed) {
      const event = events.find((e) => sameId(e._id, signup.eventId));
      const shift = shifts.find((s) => sameId(s._id, signup.shiftId));
      if (
        !event ||
        !shift ||
        event.status !== "published" ||
        !event.requiresClearance ||
        shift.startsAt <= now
      )
        continue;

      const { reasons } = await SignupService.reasonsFor(
        volunteerId,
        event,
        !!signup.approvedAt
      );
      await SignupDAO.updateById(signup._id, {
        status: "pending",
        pendingReasons: reasons,
        holdUntil: addDays(now, LAPSED_SPOT_HOLD_DAYS),
      });

      const details = NotificationService.eventDetails(event, shift);
      await NotificationService.send(
        user,
        NotificationService.templates.spotLapsed(org, {
          name: user.firstName,
          event: details,
          reason: reasonText,
          holdDays: LAPSED_SPOT_HOLD_DAYS,
        })
      );
      const organizer = await UserDAO.findById(event.organizerId);
      if (organizer) {
        await NotificationService.send(
          organizer,
          NotificationService.templates.organizerNotice(org, {
            name: organizer.firstName,
            subject: `Roster change: ${event.title}`,
            title: "A confirmed volunteer's spot is on hold",
            body: `${user.firstName} ${user.lastName} (${shift.roleName}) is no longer cleared, so their spot has reverted to pending. It is held for ${LAPSED_SPOT_HOLD_DAYS} days before returning to the waitlist.`,
            url: appUrl(`/organizer/events/${event._id}`),
          })
        );
      }
    }
  }

  /** Scheduled: held spots that were never resolved return to the waitlist. */
  static async expireHolds(): Promise<number> {
    const expired = await SignupDAO.find({
      status: "pending",
      holdUntil: { $lt: new Date() },
    });
    const settings = await OrgSettingsDAO.get();
    for (const signup of expired) {
      const [shift, event, user] = await Promise.all([
        ShiftDAO.findById(signup.shiftId),
        EventDAO.findById(signup.eventId),
        UserDAO.findById(signup.volunteerId),
      ]);
      if (!shift || !event) continue;
      await SignupService.release(signup, shift, event, settings, {
        by: null,
        reason: "Hold expired without clearance",
      });
      if (user) {
        const org = await NotificationService.org();
        await NotificationService.send(
          user,
          NotificationService.templates.signupReleased(org, {
            name: user.firstName,
            event: NotificationService.eventDetails(event, shift),
            reason: `The ${LAPSED_SPOT_HOLD_DAYS}-day hold on your ${shift.roleName} spot ended before your clearance was resolved, so the spot has been released.`,
          })
        );
      }
    }
    return expired.length;
  }

  /** Deactivation releases every future spot; past hours and certificates are untouched. */
  static async releaseFutureForUser(
    userId: string | Types.ObjectId,
    reason: string
  ): Promise<void> {
    const live = await SignupDAO.findByVolunteer(userId, LIVE_SIGNUP_STATUSES);
    if (!live.length) return;
    const settings = await OrgSettingsDAO.get();
    for (const signup of live) {
      const [shift, event] = await Promise.all([
        ShiftDAO.findById(signup.shiftId),
        EventDAO.findById(signup.eventId),
      ]);
      if (!shift || !event || shift.startsAt <= new Date()) continue;
      await SignupService.release(signup, shift, event, settings, {
        by: null,
        reason,
      });
    }
  }

  /** Event cancellation: everyone is released with the organizer's reason, nobody is promoted. */
  static async releaseAllForEvent(
    event: Doc<Event>,
    reason: string
  ): Promise<Doc<Signup>[]> {
    const live = await SignupDAO.findByEvent(event._id, LIVE_SIGNUP_STATUSES);
    const settings = await OrgSettingsDAO.get();
    const shifts = await ShiftDAO.findByEvent(event._id);
    for (const signup of live) {
      const shift = shifts.find((s) => sameId(s._id, signup.shiftId));
      if (shift)
        await SignupService.release(signup, shift, event, settings, {
          by: null,
          reason,
          promote: false,
        });
    }
    return live;
  }

  private static async notifyStatus(
    user: Doc<SafeUser>,
    event: Doc<Event>,
    shift: Doc<Shift>,
    signup: Doc<Signup>
  ): Promise<void> {
    const [org, organizer] = await Promise.all([
      NotificationService.org(),
      UserDAO.findById(event.organizerId),
    ]);
    const details = NotificationService.eventDetails(event, shift, organizer);
    const base = { name: user.firstName, event: details, role: shift.roleName };
    const content =
      signup.status === "confirmed"
        ? NotificationService.templates.signupConfirmed(org, {
            ...base,
            calendarUrl: appUrl(`/api/v1/signups/${signup._id}/calendar`),
          })
        : signup.status === "waitlisted"
          ? NotificationService.templates.waitlisted(org, base)
          : NotificationService.templates.signupPending(org, {
              ...base,
              reasons: signup.pendingReasons.map(
                (r) => PENDING_REASON_LABELS[r]
              ),
            });
    await NotificationService.send(user, content);
  }

  static async mine(actor: Actor): Promise<SignupWithContext[]> {
    const signups = (await SignupDAO.findByVolunteer(actor.id)).filter(
      (s) => s.status !== "cancelled"
    );
    return SignupService.withContext(signups);
  }

  static async withContext(
    signups: Doc<Signup>[]
  ): Promise<SignupWithContext[]> {
    if (!signups.length) return [];
    const [shifts, events] = await Promise.all([
      ShiftDAO.findByIds(signups.map((s) => s.shiftId)),
      EventDAO.findByIds(signups.map((s) => s.eventId)),
    ]);
    return signups
      .flatMap((signup) => {
        const shift = shifts.find((s) => sameId(s._id, signup.shiftId));
        const event = events.find((e) => sameId(e._id, signup.eventId));
        return shift && event ? [{ signup, shift, event }] : [];
      })
      .sort((a, b) => a.shift.startsAt.getTime() - b.shift.startsAt.getTime());
  }

  static async roster(actor: Actor, eventId: string): Promise<Roster> {
    const event = await EventDAO.findById(eventId);
    if (!event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    assertCanManageEvent(actor, event);
    const [shifts, signups] = await Promise.all([
      ShiftDAO.findByEvent(event._id),
      SignupDAO.findByEvent(event._id, [
        "pending",
        "confirmed",
        "waitlisted",
        "attended",
        "no_show",
      ]),
    ]);
    const volunteerIds = signups.map((s) => s.volunteerId);
    const [volunteers, clearances] = await Promise.all([
      UserDAO.findSummaries(volunteerIds),
      ClearanceDAO.findByUsers(volunteerIds),
    ]);
    const entries = signups.flatMap((signup) => {
      const volunteer = volunteers.find((v) =>
        sameId(v._id, signup.volunteerId)
      );
      if (!volunteer) return [];
      const clearance = clearances.find((c) =>
        sameId(c.userId, signup.volunteerId)
      );
      return [{ signup, volunteer, cleared: isCleared(clearance) }];
    });
    return { event, shifts, entries };
  }

  static async calendar(actor: Actor, signupId: string): Promise<string> {
    const signup = await SignupDAO.findById(signupId);
    if (!signup || !sameId(signup.volunteerId, actor.id))
      throw new NotFoundError(ERRORS.SIGNUP.NOT_FOUND);
    const [shift, event] = await Promise.all([
      ShiftDAO.findById(signup.shiftId),
      EventDAO.findById(signup.eventId),
    ]);
    if (!shift || !event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    const details = NotificationService.eventDetails(event, shift);
    return buildIcs({
      uid: signup._id.toString(),
      title: `${event.title} – ${shift.roleName}`,
      description: `Volunteer shift with Pink STEM. Site contact: ${details.contact}. ${details.url}`,
      location: details.where,
      startsAt: shift.startsAt,
      endsAt: shift.endsAt,
      url: details.url,
    });
  }
}
