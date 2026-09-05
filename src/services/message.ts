import { QueryFilter, Types } from "mongoose";
import EventDAO from "@/db/actions/event";
import MessageDAO from "@/db/actions/message";
import MessageThreadDAO from "@/db/actions/messageThread";
import SignupDAO from "@/db/actions/signup";
import UserDAO from "@/db/actions/user";
import {
  MAX_MESSAGES_PER_HOUR,
  MAX_THREADS_PER_HOUR,
  THREAD_READ_ONLY_AFTER_CANCEL_DAYS,
  THREAD_READ_ONLY_AFTER_EVENT_DAYS,
} from "@/constants/limits";
import { addDays, isMinor } from "@/lib/dates";
import { appUrl } from "@/lib/urls";
import AuditService from "@/services/audit";
import NotificationService from "@/services/notification";
import type { Paginated, ThreadDetail, ThreadSummary } from "@/types/api";
import type { Actor } from "@/types/auth";
import type { Event } from "@/types/event";
import {
  ForbiddenError,
  IllegalOperationError,
  InvalidArgumentsError,
  NotFoundError,
  TooManyRequestsError,
} from "@/types/exceptions";
import type { Message, MessageThread } from "@/types/message";
import type { Doc } from "@/types/models";
import { LIVE_SIGNUP_STATUSES } from "@/types/signup";
import type { SafeUser } from "@/types/user";
import { assertCanManageEvent, isAdmin, sameId } from "@/utils/authorization";
import ERRORS from "@/utils/errorMessages";
import { PAGE_SIZE } from "@/constants/limits";
import {
  broadcastSchema,
  createThreadSchema,
  reportMessageSchema,
  sendMessageSchema,
  threadFiltersSchema,
} from "@/utils/validation/message";

const HOUR = 3_600_000;

/**
 * Event-scoped messaging between one volunteer and that event's organizer.
 * Every thread is readable by admins, both parties are told so, and there
 * is no surface anywhere that puts two volunteers in contact.
 */
export default class MessageService {
  private static isParticipant(
    actor: Actor,
    thread: Pick<MessageThread, "volunteerId" | "organizerId">
  ) {
    return (
      sameId(actor.id, thread.volunteerId) ||
      sameId(actor.id, thread.organizerId)
    );
  }

  private static threadFilter(
    actor: Actor,
    filters: { eventId?: string; involvesMinor?: boolean }
  ): QueryFilter<MessageThread> {
    const id = new Types.ObjectId(actor.id);
    const filter: QueryFilter<MessageThread> = isAdmin(actor)
      ? {}
      : actor.role === "organizer"
        ? { $or: [{ organizerId: id }, { volunteerId: id }] }
        : { volunteerId: id };
    if (filters.eventId) filter.eventId = new Types.ObjectId(filters.eventId);
    if (filters.involvesMinor !== undefined)
      filter.involvesMinor = filters.involvesMinor;
    return filter;
  }

  static async listThreads(
    actor: Actor,
    input: Record<string, string | undefined>
  ): Promise<Paginated<ThreadSummary>> {
    const filters = threadFiltersSchema.parse(input);
    const filter = MessageService.threadFilter(actor, filters);
    if (filters.reported)
      filter._id = { $in: await MessageDAO.reportedThreadIds() };
    const { items, total } = await MessageThreadDAO.list(filter, filters.page);
    if (!items.length)
      return { items: [], total, page: filters.page, pageSize: PAGE_SIZE };

    const [events, people, latest, reportedIds] = await Promise.all([
      EventDAO.findByIds(items.map((t) => t.eventId)),
      UserDAO.findSummaries([
        ...new Set(
          items.flatMap((t) => [
            t.volunteerId.toString(),
            t.organizerId.toString(),
          ])
        ),
      ]),
      MessageDAO.latestByThreads(items.map((t) => t._id)),
      MessageDAO.reportedThreadIds(),
    ]);
    const summaries = await Promise.all(
      items.map(async (thread): Promise<ThreadSummary> => {
        const counterpartId = sameId(actor.id, thread.volunteerId)
          ? thread.organizerId
          : thread.volunteerId;
        const counterpart = people.find((p) => sameId(p._id, counterpartId));
        const volunteer = people.find((p) => sameId(p._id, thread.volunteerId));
        const last = latest.get(thread._id.toString());
        const unread = MessageService.isParticipant(actor, thread)
          ? await MessageDAO.countUnread(
              thread._id,
              actor.id,
              thread.lastReadAt?.[actor.id]
            )
          : 0;
        return {
          thread,
          eventTitle:
            events.find((e) => sameId(e._id, thread.eventId))?.title ?? "Event",
          counterpartName: MessageService.isParticipant(actor, thread)
            ? counterpart
              ? `${counterpart.firstName} ${counterpart.lastName}`
              : "Former member"
            : [volunteer, people.find((p) => sameId(p._id, thread.organizerId))]
                .map((p) =>
                  p ? `${p.firstName} ${p.lastName}` : "Former member"
                )
                .join(" & "),
          lastMessage: last
            ? { body: last.body, sentAt: last.sentAt, senderId: last.senderId }
            : null,
          unread,
          reported: reportedIds.some((id) => sameId(id, thread._id)),
        };
      })
    );
    return { items: summaries, total, page: filters.page, pageSize: PAGE_SIZE };
  }

  static async unreadCount(actor: Actor): Promise<number> {
    const threads = await MessageThreadDAO.findAll(
      MessageService.threadFilter(actor, {})
    );
    const counts = await Promise.all(
      threads
        .filter((t) => MessageService.isParticipant(actor, t))
        .map((t) =>
          MessageDAO.countUnread(t._id, actor.id, t.lastReadAt?.[actor.id])
        )
    );
    return counts.reduce((sum, n) => sum + n, 0);
  }

  static async getThread(
    actor: Actor,
    threadId: string
  ): Promise<ThreadDetail> {
    const thread = await MessageThreadDAO.findById(threadId);
    if (!thread) throw new NotFoundError(ERRORS.THREAD.NOT_FOUND);
    const participant = MessageService.isParticipant(actor, thread);
    if (!participant && !isAdmin(actor))
      throw new ForbiddenError(ERRORS.THREAD.NOT_PARTICIPANT);

    if (participant) {
      await MessageThreadDAO.updateById(thread._id, {
        [`lastReadAt.${actor.id}`]: new Date(),
      });
    } else {
      await AuditService.record(
        actor,
        "thread.admin_access",
        "thread",
        thread._id
      );
    }

    const [messages, event, people] = await Promise.all([
      MessageDAO.findByThread(thread._id),
      EventDAO.findById(thread.eventId),
      UserDAO.findSummaries([thread.volunteerId, thread.organizerId]),
    ]);
    const name = (id: Types.ObjectId) => {
      const p = people.find((x) => sameId(x._id, id));
      return p ? `${p.firstName} ${p.lastName}` : "Former member";
    };
    return {
      thread,
      messages,
      eventId: thread.eventId.toString(),
      eventTitle: event?.title ?? "Event",
      participants: {
        volunteer: {
          id: thread.volunteerId.toString(),
          name: name(thread.volunteerId),
        },
        organizer: {
          id: thread.organizerId.toString(),
          name: name(thread.organizerId),
        },
      },
      canReply: participant && thread.status === "open",
      isAdminView: !participant,
    };
  }

  private static async assertThreadRate(actor: Actor) {
    const since = new Date(Date.now() - HOUR);
    const id = new Types.ObjectId(actor.id);
    const recent = await MessageThreadDAO.count({
      createdAt: { $gte: since },
      $or: [{ volunteerId: id }, { organizerId: id }],
    });
    if (recent >= MAX_THREADS_PER_HOUR)
      throw new TooManyRequestsError(ERRORS.THREAD.RATE_LIMITED);
  }

  /** Finds or creates the one thread for a volunteer on an event. */
  private static async threadFor(
    event: Doc<Event>,
    volunteer: Doc<SafeUser>
  ): Promise<Doc<MessageThread>> {
    const existing = await MessageThreadDAO.findByEventAndVolunteer(
      event._id,
      volunteer._id
    );
    if (existing) {
      // An organizer change since the thread opened follows the event.
      return sameId(existing.organizerId, event.organizerId)
        ? existing
        : ((await MessageThreadDAO.updateById(existing._id, {
            organizerId: event.organizerId,
          })) as Doc<MessageThread>);
    }
    const minor = isMinor(volunteer.dateOfBirth);
    return MessageThreadDAO.create({
      eventId: event._id,
      volunteerId: volunteer._id,
      organizerId: event.organizerId,
      status: "open",
      involvesMinor: minor,
      lastMessageAt: new Date(),
      // Threads with minors are flagged for periodic admin review at creation.
      flaggedAt: minor ? new Date() : null,
      flagReason: minor ? "Involves a volunteer under 18" : undefined,
    });
  }

  static async createThread(
    actor: Actor,
    input: unknown
  ): Promise<{
    thread: Doc<MessageThread>;
    message: Doc<Message>;
    notice?: string;
  }> {
    const data = createThreadSchema.parse(input);
    const event = await EventDAO.findById(data.eventId);
    if (!event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);

    const asVolunteer = !data.volunteerId || sameId(data.volunteerId, actor.id);
    const volunteerId = asVolunteer ? actor.id : data.volunteerId!;

    if (asVolunteer) {
      const live = await SignupDAO.count({
        eventId: event._id,
        volunteerId: new Types.ObjectId(actor.id),
        status: { $in: LIVE_SIGNUP_STATUSES },
      });
      if (!live) throw new ForbiddenError(ERRORS.THREAD.NOT_ON_EVENT);
    } else {
      assertCanManageEvent(actor, event);
      const onRoster = await SignupDAO.count({
        eventId: event._id,
        volunteerId: new Types.ObjectId(volunteerId),
        status: { $ne: "cancelled" },
      });
      if (!onRoster)
        throw new InvalidArgumentsError(ERRORS.THREAD.VOLUNTEER_NOT_ON_ROSTER);
    }

    const volunteer = await UserDAO.findById(volunteerId);
    if (!volunteer) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    await MessageService.assertThreadRate(actor);
    const thread = await MessageService.threadFor(event, volunteer);
    const { message, notice } = await MessageService.deliver(
      actor,
      thread,
      data.body,
      event
    );
    return { thread, message, notice };
  }

  static async send(
    actor: Actor,
    threadId: string,
    input: unknown
  ): Promise<{ message: Doc<Message>; notice?: string }> {
    const { body } = sendMessageSchema.parse(input);
    const thread = await MessageThreadDAO.findById(threadId);
    if (!thread) throw new NotFoundError(ERRORS.THREAD.NOT_FOUND);
    if (!MessageService.isParticipant(actor, thread))
      throw new ForbiddenError(ERRORS.THREAD.NOT_PARTICIPANT);
    if (thread.status !== "open")
      throw new IllegalOperationError(ERRORS.THREAD.READ_ONLY);
    return MessageService.deliver(actor, thread, body);
  }

  private static async deliver(
    actor: Actor,
    thread: Doc<MessageThread>,
    body: string,
    event?: Doc<Event> | null
  ) {
    const recent = await MessageDAO.countBySenderSince(
      actor.id,
      new Date(Date.now() - HOUR)
    );
    if (recent >= MAX_MESSAGES_PER_HOUR)
      throw new TooManyRequestsError(ERRORS.THREAD.RATE_LIMITED);

    const now = new Date();
    const recipientId = sameId(actor.id, thread.volunteerId)
      ? thread.organizerId
      : thread.volunteerId;
    const recipient = await UserDAO.findById(recipientId);
    const message = await MessageDAO.create({
      threadId: thread._id,
      senderId: new Types.ObjectId(actor.id),
      body,
      sentAt: now,
    });
    await MessageThreadDAO.updateById(thread._id, {
      lastMessageAt: now,
      [`lastReadAt.${actor.id}`]: now,
    });

    if (!recipient || recipient.status !== "active") {
      await MessageDAO.updateById(message._id, { notifiedAt: now });
      return { message, notice: ERRORS.THREAD.RECIPIENT_INACTIVE };
    }

    // One email per message, collapsing into an hourly digest for a busy thread.
    const lastNotified = await MessageDAO.lastNotifiedAt(thread._id, actor.id);
    if (!lastNotified || now.getTime() - lastNotified.getTime() > HOUR) {
      const eventTitle =
        (event ?? (await EventDAO.findById(thread.eventId)))?.title ??
        "your event";
      const org = await NotificationService.org();
      await NotificationService.send(
        recipient,
        NotificationService.templates.newMessage(org, {
          name: recipient.firstName,
          senderName: actor.name,
          eventTitle,
          preview: body.length > 240 ? `${body.slice(0, 240)}…` : body,
          url: appUrl(`/messages/${thread._id}`),
        }),
        { category: "messages" }
      );
      await MessageDAO.updateById(message._id, { notifiedAt: now });
    }
    return { message };
  }

  /** One organizer action; lands as individual threads so replies come back one to one. */
  static async broadcast(
    actor: Actor,
    eventId: string,
    input: unknown
  ): Promise<{ sent: number }> {
    const data = broadcastSchema.parse(input);
    const event = await EventDAO.findById(eventId);
    if (!event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    assertCanManageEvent(actor, event);
    const signups = await SignupDAO.find({
      eventId: event._id,
      status: { $in: LIVE_SIGNUP_STATUSES },
      ...(data.shiftId ? { shiftId: new Types.ObjectId(data.shiftId) } : {}),
    });
    let sent = 0;
    for (const volunteerId of new Set(
      signups.map((s) => s.volunteerId.toString())
    )) {
      const volunteer = await UserDAO.findById(volunteerId);
      if (!volunteer) continue;
      const thread = await MessageService.threadFor(event, volunteer);
      if (thread.status !== "open") continue;
      await MessageService.deliver(actor, thread, data.body, event);
      sent += 1;
    }
    return { sent };
  }

  static async report(
    actor: Actor,
    threadId: string,
    input: unknown
  ): Promise<void> {
    const { messageId, reason } = reportMessageSchema.parse(input);
    const thread = await MessageThreadDAO.findById(threadId);
    if (!thread) throw new NotFoundError(ERRORS.THREAD.NOT_FOUND);
    if (!MessageService.isParticipant(actor, thread))
      throw new ForbiddenError(ERRORS.THREAD.NOT_PARTICIPANT);
    const message = await MessageDAO.findById(messageId);
    if (!message || !sameId(message.threadId, thread._id))
      throw new NotFoundError(ERRORS.THREAD.NOT_FOUND);

    const now = new Date();
    const actorId = new Types.ObjectId(actor.id);
    await MessageDAO.updateById(message._id, {
      reportedAt: now,
      reportedBy: actorId,
      reportReason: reason,
    });
    await MessageThreadDAO.updateById(thread._id, {
      flaggedAt: now,
      flaggedBy: actorId,
      flagReason: reason,
    });
    await AuditService.record(
      actor,
      "message.reported",
      "message",
      message._id,
      { after: { reason } }
    );
    await NotificationService.toAdmins((org, admin) =>
      NotificationService.templates.messageReported(org, {
        name: admin.firstName,
        reporterName: actor.name,
        reason,
        url: appUrl(`/admin/messages?thread=${thread._id}`),
      })
    );
  }

  /** Scheduled: threads go read-only 30 days after an event ends, or 7 days after a volunteer leaves it. */
  static async closeStale(): Promise<number> {
    const now = new Date();
    const open = await MessageThreadDAO.findAll({ status: "open" });
    if (!open.length) return 0;
    const events = await EventDAO.findByIds([
      ...new Set(open.map((t) => t.eventId.toString())),
    ]);
    const toClose: Types.ObjectId[] = [];

    for (const thread of open) {
      const event = events.find((e) => sameId(e._id, thread.eventId));
      const endedAt = event?.completedAt ?? event?.cancelledAt;
      if (
        endedAt &&
        addDays(endedAt, THREAD_READ_ONLY_AFTER_EVENT_DAYS) < now
      ) {
        toClose.push(thread._id);
        continue;
      }
      if (!event || event.status !== "published") continue;
      const signups = await SignupDAO.find({
        eventId: event._id,
        volunteerId: thread.volunteerId,
      });
      const live = signups.some((s) =>
        (LIVE_SIGNUP_STATUSES as readonly string[]).includes(s.status)
      );
      const lastCancel = Math.max(
        0,
        ...signups.map((s) => s.cancelledAt?.getTime() ?? 0)
      );
      if (
        !live &&
        lastCancel &&
        addDays(lastCancel, THREAD_READ_ONLY_AFTER_CANCEL_DAYS) < now
      ) {
        toClose.push(thread._id);
      }
    }
    if (toClose.length) {
      await MessageThreadDAO.updateMany(
        { _id: { $in: toClose } },
        { status: "read_only", readOnlyAt: now }
      );
    }
    return toClose.length;
  }

  /** Scheduled hourly: one digest per recipient for messages that were collapsed. */
  static async sendDigests(): Promise<number> {
    const pending = (await MessageDAO.findUnnotified()).filter(
      (m) => m.sentAt.getTime() < Date.now() - 5 * 60_000
    );
    if (!pending.length) return 0;
    const threads = await MessageThreadDAO.findAll({
      _id: { $in: [...new Set(pending.map((m) => m.threadId.toString()))] },
    });
    const events = await EventDAO.findByIds([
      ...new Set(threads.map((t) => t.eventId.toString())),
    ]);
    const byRecipient = new Map<
      string,
      Map<
        string,
        { senderId: Types.ObjectId; count: number; thread: Doc<MessageThread> }
      >
    >();

    for (const message of pending) {
      const thread = threads.find((t) => sameId(t._id, message.threadId));
      if (!thread) continue;
      const recipientId = (
        sameId(message.senderId, thread.volunteerId)
          ? thread.organizerId
          : thread.volunteerId
      ).toString();
      const perThread = byRecipient.get(recipientId) ?? new Map();
      const entry = perThread.get(thread._id.toString()) ?? {
        senderId: message.senderId,
        count: 0,
        thread,
      };
      entry.count += 1;
      perThread.set(thread._id.toString(), entry);
      byRecipient.set(recipientId, perThread);
    }

    const org = await NotificationService.org();
    let sent = 0;
    for (const [recipientId, perThread] of byRecipient) {
      const recipient = await UserDAO.findById(recipientId);
      if (!recipient) continue;
      const senders = await UserDAO.findSummaries(
        [...perThread.values()].map((e) => e.senderId)
      );
      const items = [...perThread.values()].map((e) => {
        const sender = senders.find((s) => sameId(s._id, e.senderId));
        return {
          senderName: sender
            ? `${sender.firstName} ${sender.lastName}`
            : "Pink STEM",
          eventTitle:
            events.find((ev) => sameId(ev._id, e.thread.eventId))?.title ??
            "Event",
          count: e.count,
          url: appUrl(`/messages/${e.thread._id}`),
        };
      });
      const delivered = await NotificationService.send(
        recipient,
        NotificationService.templates.messageDigest(org, {
          name: recipient.firstName,
          items,
        }),
        { category: "messages" }
      );
      if (delivered) sent += 1;
    }
    await MessageDAO.markNotified(
      pending.map((m) => m._id),
      new Date()
    );
    return sent;
  }
}
