import { Types } from "mongoose";
import NotificationLogDAO from "@/db/actions/notificationLog";
import OrgSettingsDAO from "@/db/actions/orgSettings";
import UserDAO from "@/db/actions/user";
import { formatLongDate, formatTimeRange } from "@/lib/dates";
import { EventDetails, emailTemplates } from "@/lib/emailTemplates";
import { appUrl } from "@/lib/urls";
import MailService, { EmailContent } from "@/services/mail";
import type { Event, Shift } from "@/types/event";
import type { Doc } from "@/types/models";
import type { NotificationCategory, SafeUser } from "@/types/user";

type Recipient = Pick<SafeUser, "email" | "firstName" | "status"> &
  Partial<Pick<SafeUser, "notificationPreferences">>;

type Org = { name: string; address: string; phone: string };

interface SendOptions {
  /** Which preference governs the email; confirmations are always sent. */
  category?: NotificationCategory;
  /** Idempotency key: the same key is never sent twice. */
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

  /** Every event email states event, date, time, address, and site contact. */
  static eventDetails(
    event: Doc<Event>,
    shift?: Pick<Shift, "startsAt" | "endsAt"> | null,
    organizer?: { firstName: string; lastName: string } | null
  ): EventDetails {
    const where = event.isVirtual
      ? `Virtual${event.virtualLink ? ` · ${event.virtualLink}` : ""}`
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

  static async send(
    recipient: Recipient,
    content: EmailContent,
    options: SendOptions = {}
  ): Promise<boolean> {
    if (recipient.status !== "active") return false;
    if (
      options.category &&
      recipient.notificationPreferences?.[options.category] === false
    )
      return false;
    if (
      options.dedupeKey &&
      !(await NotificationLogDAO.claim(options.dedupeKey))
    )
      return false;
    await MailService.send({ to: recipient.email, ...content });
    return true;
  }

  static async sendRaw(to: string, content: EmailContent): Promise<void> {
    await MailService.send({ to, ...content });
  }

  static async toAdmins(
    build: (org: Org, admin: Doc<SafeUser>) => EmailContent,
    dedupePrefix?: string
  ): Promise<void> {
    const [org, admins] = await Promise.all([
      NotificationService.org(),
      UserDAO.listByRole("admin"),
    ]);
    await Promise.all(
      admins.map((admin) =>
        NotificationService.send(admin, build(org, admin), {
          dedupeKey: dedupePrefix ? `${dedupePrefix}:${admin._id}` : undefined,
        })
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
