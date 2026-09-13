import { Types } from "mongoose";
import CertificateDAO from "@/db/actions/certificate";
import EventDAO from "@/db/actions/event";
import HoursLedgerDAO from "@/db/actions/hoursLedger";
import OrgSettingsDAO from "@/db/actions/orgSettings";
import ShiftDAO from "@/db/actions/shift";
import SignupDAO from "@/db/actions/signup";
import UserDAO from "@/db/actions/user";
import { RATE_LIMITS } from "@/constants/limits";
import { renderCertificatePdf } from "@/lib/pdf/certificate";
import { assertRateLimit } from "@/lib/rateLimit";
import {
  generateVerificationCode,
  normalizeVerificationCode,
} from "@/lib/tokens";
import { appUrl } from "@/lib/urls";
import AuditService from "@/services/audit";
import NotificationService from "@/services/notification";
import type { Actor } from "@/types/auth";
import type {
  Certificate,
  CertificateItem,
  VerificationResult,
} from "@/types/certificate";
import type { Event } from "@/types/event";
import {
  ConflictError,
  InvalidArgumentsError,
  NotFoundError,
} from "@/types/exceptions";
import type { Doc } from "@/types/models";
import type { SafeUser } from "@/types/user";
import { isAdmin, sameId } from "@/utils/authorization";
import ERRORS from "@/utils/errorMessages";
import { revokeCertificateSchema } from "@/utils/validation/admin";
import { serviceRecordSchema } from "@/utils/validation/certificate";

/**
 * Certificates are immutable snapshots with a public verification code. If
 * the hours behind one change, it is revoked and a replacement is issued.
 */
export default class CertificateService {
  private static async issue(
    data: Omit<
      Certificate,
      "verificationCode" | "issuedAt" | "signatoryName" | "signatoryTitle"
    >,
    actor: Actor
  ): Promise<Doc<Certificate>> {
    const settings = await OrgSettingsDAO.get();
    const certificate = await CertificateDAO.create({
      ...data,
      signatoryName: settings.signatoryName,
      signatoryTitle: settings.signatoryTitle,
      verificationCode: generateVerificationCode(),
      issuedAt: new Date(),
    });
    await AuditService.record(
      actor,
      "certificate.issued",
      "certificate",
      certificate._id,
      {
        after: {
          type: data.type,
          totalHours: data.totalHours,
          volunteerId: data.volunteerId,
        },
      }
    );
    return certificate;
  }

  static issueEventCertificate(
    volunteer: Doc<SafeUser>,
    event: Doc<Event>,
    roleName: string,
    hours: number,
    approver: Actor
  ) {
    return CertificateService.issue(
      {
        volunteerId: volunteer._id,
        type: "event",
        eventId: event._id,
        volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
        periodStart: event.eventDate,
        periodEnd: event.eventDate,
        totalHours: hours,
        items: [
          {
            eventId: event._id,
            eventTitle: event.title,
            eventDate: event.eventDate,
            roleName,
            hours,
          },
        ],
      },
      approver
    );
  }

  private static async buildServiceItems(
    volunteerId: Types.ObjectId,
    from: Date,
    to: Date
  ): Promise<CertificateItem[]> {
    const hoursByEvent = await HoursLedgerDAO.hoursByEventForVolunteer(
      volunteerId,
      from,
      to
    );
    if (!hoursByEvent.length) return [];
    const eventIds = hoursByEvent.map((h) => h.eventId);
    const [events, signups] = await Promise.all([
      EventDAO.findByIds(eventIds),
      SignupDAO.find({
        volunteerId,
        eventId: { $in: eventIds },
        status: "attended",
      }),
    ]);
    const shifts = await ShiftDAO.findByIds(signups.map((s) => s.shiftId));
    return hoursByEvent
      .flatMap(({ eventId, hours }) => {
        const event = events.find((e) => sameId(e._id, eventId));
        if (!event) return [];
        const roles = signups
          .filter((s) => sameId(s.eventId, eventId))
          .map((s) => shifts.find((sh) => sameId(sh._id, s.shiftId))?.roleName)
          .filter((r): r is string => !!r);
        return [
          {
            eventId,
            eventTitle: event.title,
            eventDate: event.eventDate,
            roleName: [...new Set(roles)].join(", ") || "Volunteer",
            hours,
          },
        ];
      })
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  }

  static async issueServiceRecord(
    volunteer: Doc<SafeUser>,
    from: Date,
    to: Date,
    actor: Actor
  ): Promise<Doc<Certificate>> {
    const items = await CertificateService.buildServiceItems(
      volunteer._id,
      from,
      to
    );
    if (!items.length)
      throw new InvalidArgumentsError(ERRORS.CERTIFICATE.NO_HOURS);
    return CertificateService.issue(
      {
        volunteerId: volunteer._id,
        type: "service_record",
        eventId: null,
        volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
        periodStart: from,
        periodEnd: to,
        totalHours: items.reduce((sum, i) => sum + i.hours, 0),
        items,
      },
      actor
    );
  }

  /** Volunteer-requested, generated on demand. */
  static async requestServiceRecord(
    actor: Actor,
    input: unknown
  ): Promise<Doc<Certificate>> {
    const { periodStart, periodEnd } = serviceRecordSchema.parse(input);
    if (periodEnd <= periodStart)
      throw new InvalidArgumentsError(ERRORS.CERTIFICATE.PERIOD);
    const volunteer = await UserDAO.findById(actor.id);
    if (!volunteer) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    return CertificateService.issueServiceRecord(
      volunteer,
      periodStart,
      periodEnd,
      actor
    );
  }

  static mine(actor: Actor): Promise<Doc<Certificate>[]> {
    return CertificateDAO.findByVolunteer(actor.id);
  }

  static async pdf(
    actor: Actor,
    certificateId: string
  ): Promise<{ bytes: Uint8Array; filename: string }> {
    const certificate = await CertificateDAO.findById(certificateId);
    if (
      !certificate ||
      (!isAdmin(actor) && !sameId(certificate.volunteerId, actor.id))
    ) {
      throw new NotFoundError(ERRORS.CERTIFICATE.NOT_FOUND);
    }
    const settings = await OrgSettingsDAO.get();
    const bytes = await renderCertificatePdf(
      certificate,
      settings,
      appUrl(`/verify/${certificate.verificationCode}`)
    );
    const kind =
      certificate.type === "event" ? "certificate" : "service-record";
    return {
      bytes,
      filename: `pink-stem-${kind}-${certificate.verificationCode}.pdf`,
    };
  }

  /** Public. Shows only what a third party needs, and nothing else. */
  static async verify(code: string, ip: string): Promise<VerificationResult> {
    assertRateLimit(`verify:${ip}`, RATE_LIMITS.verify);
    const certificate = await CertificateDAO.findByCode(
      normalizeVerificationCode(code)
    );
    if (!certificate) return { status: "not_found" };
    return {
      status: certificate.revokedAt ? "revoked" : "valid",
      volunteerName: certificate.volunteerName,
      totalHours: certificate.totalHours,
      periodStart: certificate.periodStart,
      periodEnd: certificate.periodEnd,
      issuedAt: certificate.issuedAt,
      type: certificate.type,
    };
  }

  static async revoke(
    admin: Actor,
    certificateId: string,
    input: unknown
  ): Promise<Doc<Certificate>> {
    const { reason } = revokeCertificateSchema.parse(input);
    const certificate = await CertificateDAO.findById(certificateId);
    if (!certificate) throw new NotFoundError(ERRORS.CERTIFICATE.NOT_FOUND);
    if (certificate.revokedAt)
      throw new ConflictError(ERRORS.CERTIFICATE.ALREADY_REVOKED);
    const revoked = (await CertificateDAO.updateById(certificate._id, {
      revokedAt: new Date(),
      revokedBy: new Types.ObjectId(admin.id),
      revocationReason: reason,
    })) as Doc<Certificate>;
    await AuditService.record(
      admin,
      "certificate.revoked",
      "certificate",
      certificate._id,
      { after: { reason } }
    );
    return revoked;
  }

  /** After an hours correction: revoke every certificate covering the event and issue replacements. */
  static async reissueAfterAdjustment(
    volunteer: Doc<SafeUser>,
    event: Doc<Event>,
    admin: Actor
  ): Promise<void> {
    const affected = await CertificateDAO.findActiveCoveringEvent(
      volunteer._id,
      event._id
    );
    if (!affected.length) return;

    for (const old of affected) {
      const revoked = await CertificateService.revoke(
        admin,
        old._id.toString(),
        { reason: "Hours corrected; replacement issued" }
      );
      let replacement: Doc<Certificate> | null = null;
      if (old.type === "event") {
        const items = await CertificateService.buildServiceItems(
          volunteer._id,
          event.eventDate,
          event.eventDate
        );
        const item = items.find((i) => sameId(i.eventId, event._id));
        if (item)
          replacement = await CertificateService.issueEventCertificate(
            volunteer,
            event,
            item.roleName,
            item.hours,
            admin
          );
      } else {
        const items = await CertificateService.buildServiceItems(
          volunteer._id,
          old.periodStart,
          old.periodEnd
        );
        if (items.length)
          replacement = await CertificateService.issueServiceRecord(
            volunteer,
            old.periodStart,
            old.periodEnd,
            admin
          );
      }
      if (replacement)
        await CertificateDAO.updateById(revoked._id, {
          supersededBy: replacement._id,
        });
    }

    const org = await NotificationService.org();
    await NotificationService.send(
      volunteer,
      NotificationService.templates.certificateReissued(org, {
        name: volunteer.firstName,
        url: appUrl("/hours"),
      })
    );
  }
}
