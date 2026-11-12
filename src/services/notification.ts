import { Types } from "mongoose";
import NotificationLogDAO from "@/db/actions/notificationLog";
import OrgSettingsDAO from "@/db/actions/orgSettings";
import UserDAO from "@/db/actions/user";
import { formatLongDate, formatTimeRange } from "@/lib/dates";
import { EventDetails, emailTemplates } from "@/lib/emailTemplates";
import { appUrl } from "@/lib/urls";
import { countOutcomes } from "@/lib/sendCounts";
import MailService, { EmailContent, MailError } from "@/services/mail";
import type { Event, Shift } from "@/types/event";
import type { Doc } from "@/types/models";
import type { SendCounts, SendOutcome } from "@/types/notification";
import type { NotificationCategory, SafeUser } from "@/types/user";

type Recipient = Pick<SafeUser, "email" | "firstName" | "status"> &
  Partial<Pick<SafeUser, "notificationPreferences">>;

type Org = { name: string; address: string; phone: string };

interface SendOptions {
  /** Which preference governs the email; confirmations are always sent. */
  category?: NotificationCategory;
  /**
   * Idempotency key: once sent, the key is never sent again. A failed send
   * frees the key, so the next run retries it.
   */
  dedupeKey?: string;
}

/**
 * Turns domain events into emails. Knows about recipients, preferences, and
 * idempotency; leaves wording to `emailTemplates`.
 */
export default class NotificationService {
  static async org(): Promise<Org> {
    const s = await OrgSettingsDAO.get();
    return {
      name: s.orgName,
      address: `${s.addressLine1}, ${s.addressLine2}`,
      phone: s.phone,
    };
  }

  /**
   * Every event email states event, date, time, address, and site contact.
   * A virtual event's join link is left out unless `joinLink` is set, which
   * callers do only for a volunteer confirmed on the event (see joinLink.ts).
   */
  static eventDetails(
    event: Doc<Event>,
    shift?: Pick<Shift, "startsAt" | "endsAt"> | null,
    organizer?: { firstName: string; lastName: string } | null,
    { joinLink = false }: { joinLink?: boolean } = {}
  ): EventDetails {
    const where = event.isVirtual
      ? `Virtual${joinLink && event.virtualLink ? ` · ${event.virtualLink}` : ""}`
      : [
          event.locationName,
          event.address,
          event.locationNote && `(${event.locationNote})`,
        ]
          .filter(Boolean)
          .join(", ");
    const contact = event.siteContactName
      ? `${event.siteContactName}${event.siteContactPhone ? ` · ${event.siteContactPhone}` : ""}`
      : organizer
        ? `${organizer.firstName} ${organizer.lastName} (organizer)`
        : "See event page";
    return {
      title: event.title,
      date: formatLongDate(shift?.startsAt ?? event.eventDate),
      time: shift
        ? formatTimeRange(shift.startsAt, shift.endsAt)
        : "See shift times on the event page",
      where: where || "See event page",
      contact,
      url: appUrl(`/events/${event._id}`),
    };
  }

  /**
   * Sends one email and reports what happened. A mail failure is logged and
   * returned as "failed", never thrown, so a Resend outage cannot fail the
   * request or job that triggered the email.
   */
  static async send(
    recipient: Recipient,
    content: EmailContent,
    options: SendOptions = {}
  ): Promise<SendOutcome> {
    if (recipient.status !== "active") return "skipped";
    if (
      options.category &&
      recipient.notificationPreferences?.[options.category] === false
    )
      return "skipped";

    const key = options.dedupeKey;
    const claimedAt = key ? await NotificationLogDAO.claim(key) : null;
    if (key && !claimedAt) return "skipped";

    try {
      await MailService.send({ to: recipient.email, ...content });
    } catch (error) {
      if (!(error instanceof MailError)) throw error;
      console.error(
        `[mail] ${error.kind}: "${content.subject}" to ${recipient.email}: ${error.message}`
      );
      if (key && claimedAt)
        await NotificationLogDAO.markFailed(
          key,
          claimedAt,
          error.kind,
          error.message
        );
      return "failed";
    }
    if (key && claimedAt) await NotificationLogDAO.markSent(key, claimedAt);
    return "sent";
  }

  /**
   * Sends to an address that may have no account yet. Throws `MailError` on
   * failure, since the caller is waiting on it and can try again.
   */
  static async sendRaw(to: string, content: EmailContent): Promise<void> {
    await MailService.send({ to, ...content });
  }

  static async toAdmins(
    build: (org: Org, admin: Doc<SafeUser>) => EmailContent,
    dedupePrefix?: string
  ): Promise<SendCounts> {
    const [org, admins] = await Promise.all([
      NotificationService.org(),
      UserDAO.listByRole("admin"),
    ]);
    return countOutcomes(
      await Promise.all(
        admins.map((admin) =>
          NotificationService.send(admin, build(org, admin), {
            dedupeKey: dedupePrefix
              ? `${dedupePrefix}:${admin._id}`
              : undefined,
          })
        )
      )
    );
  }

  static async toUsers(
    userIds: (string | Types.ObjectId)[],
    build: (org: Org, user: Doc<SafeUser>) => EmailContent,
    options: SendOptions = {}
  ): Promise<void> {
    if (!userIds.length) return;
    const org = await NotificationService.org();
    const users = await Promise.all(userIds.map((id) => UserDAO.findById(id)));
    await Promise.all(
      users
        .filter((user): user is Doc<SafeUser> => user !== null)
        .map((user) =>
          NotificationService.send(user, build(org, user), {
            ...options,
            dedupeKey: options.dedupeKey
              ? `${options.dedupeKey}:${user._id}`
              : undefined,
          })
        )
    );
  }

  static templates = emailTemplates;
}
