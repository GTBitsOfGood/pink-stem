import { Types } from "mongoose";
import EventUpdateDAO from "@/db/actions/eventUpdate";
import EventDAO from "@/db/actions/event";
import SignupDAO from "@/db/actions/signup";
import UserDAO from "@/db/actions/user";
import NotificationLogDAO from "@/db/actions/notificationLog";
import {
  NOTE_DIGEST_INTERVAL_HOURS,
  NOTE_DIGEST_RETRY_DAYS,
} from "@/constants/limits";
import { addHours } from "@/lib/dates";
import { emptyCounts } from "@/lib/sendCounts";
import { appUrl } from "@/lib/urls";
import MessageService from "@/services/message";
import NotificationService from "@/services/notification";
import type { UpdateWithAuthor } from "@/types/api";
import type { Actor } from "@/types/auth";
import type { Event, EventUpdate } from "@/types/event";
import { IllegalOperationError, NotFoundError } from "@/types/exceptions";
import type { Doc } from "@/types/models";
import type { SendCounts } from "@/types/notification";
import { assertCanManageEvent, sameId } from "@/utils/authorization";
import ERRORS from "@/utils/errorMessages";
import {
  editUpdateSchema,
  eventUpdateInputSchema,
} from "@/utils/validation/event";

type Batch = {
  eventId: Types.ObjectId;
  at: Date;
  notes: Doc<EventUpdate>[];
};

/** `note-digest:<eventId>:<batch ISO time>:<userId>`; the time has colons in it. */
const DIGEST_KEY = /^note-digest:([0-9a-f]{24}):(.+):([0-9a-f]{24})$/;

/**
 * Short posts attached to an event. Notes collect into a daily digest;
 * important changes email everyone signed up immediately and pin to the
 * top of the page until the event completes.
 */
export default class EventUpdateService {
  private static async withAuthors(
    updates: Doc<EventUpdate>[]
  ): Promise<UpdateWithAuthor[]> {
    if (!updates.length) return [];
    const authors = await UserDAO.findSummaries([
      ...new Set(updates.map((u) => u.authorId.toString())),
    ]);
    return updates.map((update) => {
      const author = authors.find((a) => sameId(a._id, update.authorId));
      return {
        ...update,
        authorName: author
          ? `${author.firstName} ${author.lastName}`
          : "Pink STEM",
      };
    });
  }

  static async list(
    event: Doc<Event>,
    includeRosterOnly: boolean
  ): Promise<UpdateWithAuthor[]> {
    return EventUpdateService.withAuthors(
      await EventUpdateDAO.findByEvent(event._id, { includeRosterOnly })
    );
  }

  static async create(
    actor: Actor,
    eventId: string,
    input: unknown
  ): Promise<UpdateWithAuthor> {
    const data = eventUpdateInputSchema.parse(input);
    const event = await EventDAO.findById(eventId);
    if (!event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    assertCanManageEvent(actor, event);
    if (event.status === "completed" || event.status === "cancelled") {
      throw new IllegalOperationError(ERRORS.EVENT.NOT_EDITABLE);
    }

    const important = data.kind === "important";
    const update = await EventUpdateDAO.create({
      eventId: event._id,
      authorId: new Types.ObjectId(actor.id),
      kind: data.kind,
      body: data.body,
      rosterOnly: data.rosterOnly,
      pinned: important,
      postedAt: new Date(),
    });

    // Drafts are invisible to volunteers and produce no notifications.
    if (event.status === "published") {
      if (important) await EventUpdateService.emailImportant(event, update);
      await MessageService.postEventUpdate(event, update);
    }
    const [withAuthor] = await EventUpdateService.withAuthors([update]);
    return withAuthor;
  }

  /** Cancellation posts the organizer's reason so the page and the email agree. */
  static async postSystemUpdate(
    actor: Actor,
    event: Doc<Event>,
    body: string
  ): Promise<void> {
    await EventUpdateDAO.unpinForEvent(event._id);
    await EventUpdateDAO.create({
      eventId: event._id,
      authorId: new Types.ObjectId(actor.id),
      kind: "important",
      body,
      rosterOnly: false,
      pinned: true,
      postedAt: new Date(),
      notifiedAt: new Date(),
    });
  }

  private static async emailImportant(
    event: Doc<Event>,
    update: Doc<EventUpdate>
  ): Promise<void> {
    const signups = await SignupDAO.findByEvent(event._id, [
      "confirmed",
      "waitlisted",
    ]);
    const recipients = [
      ...new Set(signups.map((s) => s.volunteerId.toString())),
    ];
    const details = NotificationService.eventDetails(event);
    await NotificationService.toUsers(recipients, (org, user) =>
      NotificationService.templates.importantChange(org, {
        name: user.firstName,
        event: details,
        body: update.body,
      })
    );
    await EventUpdateDAO.updateById(update._id, { notifiedAt: new Date() });
  }

  private static async manageable(actor: Actor, updateId: string) {
    const update = await EventUpdateDAO.findById(updateId);
    if (!update || update.deletedAt)
      throw new NotFoundError(ERRORS.UPDATE.NOT_FOUND);
    const event = await EventDAO.findById(update.eventId);
    if (!event) throw new NotFoundError(ERRORS.EVENT.NOT_FOUND);
    assertCanManageEvent(actor, event);
    return update;
  }

  static async edit(
    actor: Actor,
    updateId: string,
    input: unknown
  ): Promise<UpdateWithAuthor> {
    const { body } = editUpdateSchema.parse(input);
    const update = await EventUpdateService.manageable(actor, updateId);
    const edited = (await EventUpdateDAO.updateById(update._id, {
      body,
      editedAt: new Date(),
    })) as Doc<EventUpdate>;
    const [withAuthor] = await EventUpdateService.withAuthors([edited]);
    return withAuthor;
  }

  /** Soft delete. An important change that already went out by email stays. */
  static async remove(actor: Actor, updateId: string): Promise<void> {
    const update = await EventUpdateService.manageable(actor, updateId);
    if (update.kind === "important" && update.notifiedAt) {
      throw new IllegalOperationError(ERRORS.UPDATE.IMPORTANT_LOCKED);
    }
    await EventUpdateDAO.updateById(update._id, {
      deletedAt: new Date(),
      pinned: false,
    });
  }

  /**
   * At most one digest per event per NOTE_DIGEST_INTERVAL_HOURS, though the
   * job runs hourly. A digest is a batch: its notes are marked notified with
   * one timestamp before anything is sent, and each recipient's email is
   * keyed on that timestamp. Until the interval passes, every run re-sends
   * the batch to anyone not yet sent it (a failure, or a crash mid-run), and
   * new notes wait for the next batch. After that, a recipient whose email
   * failed is still retried until it goes out.
   */
  static async sendNoteDigest(): Promise<SendCounts> {
    const now = new Date();
    const [pending, recent, failedKeys] = await Promise.all([
      EventUpdateDAO.findUnnotifiedNotes(),
      EventUpdateDAO.findNotesNotifiedSince(
        addHours(now, -NOTE_DIGEST_INTERVAL_HOURS)
      ),
      NotificationLogDAO.findFailedKeys(
        "note-digest:",
        addHours(now, -NOTE_DIGEST_RETRY_DAYS * 24)
      ),
    ]);
    const counts = emptyCounts();

    // Each event's latest batch within the interval, deleted notes included
    // so deleting a sent digest's notes does not let another go out early.
    const batches = new Map<string, Batch>();
    for (const note of recent) {
      const id = note.eventId.toString();
      const at = note.notifiedAt!;
      const batch = batches.get(id);
      if (!batch || at > batch.at)
        batches.set(id, { eventId: note.eventId, at, notes: [note] });
      else if (+at === +batch.at) batch.notes.push(note);
    }
    for (const batch of batches.values())
      batch.notes = batch.notes.filter((n) => !n.deletedAt);

    // Events with new notes and no batch in the interval start one now.
    const started = pending.filter((n) => !batches.has(n.eventId.toString()));
    for (const note of started) {
      const id = note.eventId.toString();
      const batch = batches.get(id) ?? {
        eventId: note.eventId,
        at: now,
        notes: [],
      };
      batch.notes.push(note);
      batches.set(id, batch);
    }
    if (started.length)
      await EventUpdateDAO.markNotified(
        started.map((n) => n._id),
        now
      );

    // Older batches go only to the recipients whose email failed.
    const older = new Map<string, Batch & { userIds: Set<string> }>();
    for (const key of failedKeys) {
      const match = DIGEST_KEY.exec(key);
      if (!match) continue;
      const [, eventId, iso, userId] = match;
      if (batches.get(eventId)?.at.toISOString() === iso) continue;
      const batch = older.get(`${eventId}:${iso}`) ?? {
        eventId: new Types.ObjectId(eventId),
        at: new Date(iso),
        notes: [],
        userIds: new Set<string>(),
      };
      batch.userIds.add(userId);
      older.set(`${eventId}:${iso}`, batch);
    }
    const olderNotes = await EventUpdateDAO.findNotesInBatches([
      ...older.values(),
    ]);
    for (const batch of older.values())
      batch.notes = olderNotes.filter(
        (n) => sameId(n.eventId, batch.eventId) && +n.notifiedAt! === +batch.at
      );

    const all = [
      ...[...batches.values()].map((b) => ({ ...b, userIds: null })),
      ...older.values(),
    ].filter((b) => b.notes.length);
    if (!all.length) return counts;

    const eventIds = [...new Set(all.map((b) => b.eventId.toString()))];
    const [events, org] = await Promise.all([
      EventDAO.findByIds(eventIds),
      NotificationService.org(),
    ]);
    for (const batch of all) {
      const event = events.find((e) => sameId(e._id, batch.eventId));
      if (!event || event.status !== "published") continue;
      const notes = await EventUpdateService.withAuthors(batch.notes);
      // Only volunteers still on the event who were on it when the batch went out.
      const signups = (
        await SignupDAO.findByEvent(event._id, [
          "pending",
          "confirmed",
          "waitlisted",
        ])
      ).filter(
        (s) =>
          s.signedUpAt <= batch.at &&
          (!batch.userIds || batch.userIds.has(s.volunteerId.toString()))
      );
      const users = await UserDAO.findByIds([
        ...new Set(signups.map((s) => s.volunteerId.toString())),
      ]);
      for (const user of users) {
        const outcome = await NotificationService.send(
          user,
          NotificationService.templates.noteDigest(org, {
            name: user.firstName,
            eventTitle: event.title,
            url: appUrl(`/events/${event._id}`),
            notes: notes.map((n) => ({ author: n.authorName, body: n.body })),
          }),
          {
            category: "updates",
            dedupeKey: `note-digest:${event._id}:${batch.at.toISOString()}:${user._id}`,
          }
        );
        counts[outcome] += 1;
      }
    }
    return counts;
  }
}
