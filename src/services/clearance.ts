import { Types } from "mongoose";
import ClearanceDAO from "@/db/actions/clearance";
import UserDAO from "@/db/actions/user";
import { CLEARANCE_LABELS } from "@/constants/labels";
import { CLEARANCE_EXPIRY_WARNING_DAYS } from "@/constants/limits";
import { addDays, formatLongDate } from "@/lib/dates";
import { addCounts, emptyCounts } from "@/lib/sendCounts";
import { appUrl } from "@/lib/urls";
import AuditService from "@/services/audit";
import NotificationService from "@/services/notification";
import SignupService from "@/services/signup";
import type { Actor } from "@/types/auth";
import { InvalidArgumentsError, NotFoundError } from "@/types/exceptions";
import type { Doc } from "@/types/models";
import type { SendCounts } from "@/types/notification";
import type { Clearance } from "@/types/user";
import ERRORS from "@/utils/errorMessages";
import { clearanceInputSchema } from "@/utils/validation/admin";

/**
 * Background screening outcomes. v1 records the result of a check run
 * elsewhere; it never runs one. Admin-only end to end.
 */
export default class ClearanceService {
  static async record(
    admin: Actor,
    userId: string,
    input: unknown
  ): Promise<Doc<Clearance>> {
    const data = clearanceInputSchema.parse(input);
    const user = await UserDAO.findById(userId);
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);

    const cleared = data.status === "cleared";
    if (cleared && !data.expiresOn)
      throw new InvalidArgumentsError(ERRORS.CLEARANCE.EXPIRY_REQUIRED);
    if (cleared && data.expiresOn && data.expiresOn <= new Date()) {
      throw new InvalidArgumentsError(ERRORS.CLEARANCE.EXPIRY_PAST);
    }

    const before = await ClearanceDAO.findByUser(userId);
    const record = await ClearanceDAO.upsert(userId, {
      status: data.status,
      clearedOn: cleared ? (data.clearedOn ?? new Date()) : null,
      expiresOn: cleared ? data.expiresOn : null,
      recordedBy: new Types.ObjectId(admin.id),
      notes: data.notes,
    });

    await AuditService.record(
      admin,
      "clearance.recorded",
      "clearance",
      record._id,
      {
        before: before
          ? { status: before.status, expiresOn: before.expiresOn }
          : null,
        after: { status: record.status, expiresOn: record.expiresOn },
      }
    );

    const org = await NotificationService.org();
    await NotificationService.send(
      user,
      NotificationService.templates.clearanceRecorded(org, {
        name: user.firstName,
        statusLabel: CLEARANCE_LABELS[record.status],
        url: appUrl("/dashboard"),
      })
    );

    if (cleared) {
      await SignupService.reevaluateForVolunteer(userId);
    } else if (before?.status === "cleared") {
      await SignupService.lapseForVolunteer(
        userId,
        "Your background clearance is no longer current."
      );
    }
    return record;
  }

  /** Scheduled: warn volunteers and admins about clearances expiring within 30 days. */
  static async warnExpiring(): Promise<SendCounts> {
    const now = new Date();
    const expiring = await ClearanceDAO.findExpiringBetween(
      now,
      addDays(now, CLEARANCE_EXPIRY_WARNING_DAYS)
    );
    const org = await NotificationService.org();
    const counts = emptyCounts();
    for (const record of expiring) {
      const user = await UserDAO.findById(record.userId);
      if (!user || !record.expiresOn) {
        counts.skipped += 1;
        continue;
      }
      const key = `clearance-expiring:${record._id}:${record.expiresOn.toISOString()}`;
      const expiresOn = formatLongDate(record.expiresOn);
      const outcome = await NotificationService.send(
        user,
        NotificationService.templates.clearanceExpiring(org, {
          name: user.firstName,
          expiresOn,
          url: appUrl("/profile"),
        }),
        { dedupeKey: key }
      );
      counts[outcome] += 1;
      // Admins hear about it once the volunteer has. Going on when the
      // volunteer's key was already sent lets an admin copy that failed on an
      // earlier run go out now; the admin keys keep the rest from repeating.
      if (user.status === "active" && outcome !== "failed") {
        const admins = await NotificationService.toAdmins(
          (o, admin) =>
            NotificationService.templates.clearanceExpiring(o, {
              name: admin.firstName,
              expiresOn: `${expiresOn} (volunteer: ${user.firstName} ${user.lastName})`,
              url: appUrl(`/admin/people/${user._id}`),
            }),
          key
        );
        addCounts(counts, admins);
      }
    }
    return counts;
  }

  /** Scheduled: flip lapsed clearances to expired and put affected spots on hold. sent = clearances expired. */
  static async expireLapsed(): Promise<SendCounts> {
    const lapsed = await ClearanceDAO.expireLapsed(new Date());
    for (const record of lapsed) {
      await SignupService.lapseForVolunteer(
        record.userId,
        "Your background clearance has expired."
      );
    }
    return { sent: lapsed.length, skipped: 0, failed: 0 };
  }
}
