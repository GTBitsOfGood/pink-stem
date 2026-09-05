import { Types } from "mongoose";
import EventUpdateDAO from "@/db/actions/eventUpdate";
import EventDAO from "@/db/actions/event";
import SignupDAO from "@/db/actions/signup";
import UserDAO from "@/db/actions/user";
import { appUrl } from "@/lib/urls";
import NotificationService from "@/services/notification";
import type { UpdateWithAuthor } from "@/types/api";
import type { Actor } from "@/types/auth";
import type { Event, EventUpdate } from "@/types/event";
import { IllegalOperationError, NotFoundError } from "@/types/exceptions";
import type { Doc } from "@/types/models";
import { assertCanManageEvent, sameId } from "@/utils/authorization";
import ERRORS from "@/utils/errorMessages";
import {
  editUpdateSchema,
  eventUpdateInputSchema,
} from "@/utils/validation/event";

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
    if (important && event.status === "published") {
      await EventUpdateService.emailImportant(event, update);
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

  /** Scheduled daily: one email per event per volunteer with every new note. */
  static async sendNoteDigest(): Promise<number> {
    const notes = await EventUpdateDAO.findUnnotifiedNotes();
    if (!notes.length) return 0;
    const eventIds = [...new Set(notes.map((n) => n.eventId.toString()))];
    const events = await EventDAO.findByIds(eventIds);
    const org = await NotificationService.org();
    let sent = 0;

    for (const event of events) {
      if (event.status !== "published") continue;
      const eventNotes = await EventUpdateService.withAuthors(
        notes.filter((n) => sameId(n.eventId, event._id))
      );
      const signups = await SignupDAO.findByEvent(event._id, [
        "pending",
        "confirmed",
        "waitlisted",
      ]);
      for (const volunteerId of new Set(
        signups.map((s) => s.volunteerId.toString())
      )) {
        const user = await UserDAO.findById(volunteerId);
        if (!user) continue;
        const delivered = await NotificationService.send(
          user,
          NotificationService.templates.noteDigest(org, {
            name: user.firstName,
            eventTitle: event.title,
            url: appUrl(`/events/${event._id}`),
            notes: eventNotes.map((n) => ({
              author: n.authorName,
              body: n.body,
            })),
          }),
          { category: "updates" }
        );
        if (delivered) sent += 1;
      }
    }
    await EventUpdateDAO.markNotified(
      notes.map((n) => n._id),
      new Date()
    );
    return sent;
  }
}
