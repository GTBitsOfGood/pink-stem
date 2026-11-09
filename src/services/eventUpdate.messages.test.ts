import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import mongoose from "mongoose";
import MessageDAO from "@/db/actions/message";
import MessageThreadDAO from "@/db/actions/messageThread";
import { MAX_MESSAGES_PER_HOUR } from "@/constants/limits";
import EventService from "@/services/event";
import EventUpdateService from "@/services/eventUpdate";
import MessageService from "@/services/message";
import {
  actorFor,
  makeEvent,
  makeSignup,
  makeUser,
  setupTestDatabase,
} from "@/test/setup";
import type { Event, Shift } from "@/types/event";
import type { Doc } from "@/types/models";
import type { User } from "@/types/user";

const { sent } = setupTestDatabase();

describe("event updates are delivered to the approved roster as messages", () => {
  let organizer: Doc<User>;
  let event: Doc<Event>;
  let shift: Doc<Shift>;
  let confirmed: Doc<User>;

  beforeEach(async () => {
    organizer = await makeUser({ role: "organizer", firstName: "Olive" });
    ({ event, shift } = await makeEvent(organizer));
    confirmed = await makeUser({ firstName: "Confirmed" });
    await makeSignup(confirmed, event, shift);
  });

  const post = (
    body = "Parking moved to Lot B.",
    extra: { kind?: "note" | "important"; rosterOnly?: boolean } = {},
    as = organizer
  ) =>
    EventUpdateService.create(actorFor(as), event._id.toString(), {
      kind: "note",
      rosterOnly: false,
      body,
      ...extra,
    });
  const threadOf = (volunteer: Doc<User>) =>
    MessageThreadDAO.findByEventAndVolunteer(event._id, volunteer._id);
  /** Backdates messages past the digest's five-minute settle window. */
  const ageMessages = () =>
    mongoose.connection
      .collection("messages")
      .updateMany({}, { $set: { sentAt: new Date(Date.now() - 600_000) } });

  test("each confirmed volunteer gets the update in a new thread with the organizer", async () => {
    const update = await post();

    const thread = await threadOf(confirmed);
    assert.ok(thread, "a thread is opened");
    assert.equal(thread.organizerId.toString(), organizer._id.toString());
    const [message] = await MessageDAO.findByThread(thread._id);
    assert.equal(message.body, "Parking moved to Lot B.");
    assert.equal(message.senderId.toString(), organizer._id.toString());
    assert.equal(message.eventUpdateId?.toString(), update._id.toString());
  });

  test("pending, waitlisted and cancelled volunteers get no message", async () => {
    const others = await Promise.all(
      (["pending", "waitlisted", "cancelled"] as const).map(async (status) => {
        const user = await makeUser();
        await makeSignup(user, event, shift, { status });
        return user;
      })
    );

    await post();

    for (const user of others) assert.equal(await threadOf(user), null);
  });

  test("an existing thread is reused rather than duplicated", async () => {
    const { thread } = await MessageService.createThread(actorFor(confirmed), {
      eventId: event._id.toString(),
      body: "Hi! Where do I park?",
    });

    await post();

    const threads = await MessageThreadDAO.findAll({
      eventId: event._id,
      volunteerId: confirmed._id,
    });
    assert.equal(threads.length, 1);
    assert.equal(threads[0]._id.toString(), thread._id.toString());
    assert.equal((await MessageDAO.findByThread(thread._id)).length, 2);
  });

  test("the update counts as unread until the volunteer opens the thread", async () => {
    await post();
    assert.equal(await MessageService.unreadCount(actorFor(confirmed)), 1);
    assert.equal(await MessageService.unreadCount(actorFor(organizer)), 0);

    const thread = (await threadOf(confirmed))!;
    await MessageService.getThread(actorFor(confirmed), thread._id.toString());

    assert.equal(await MessageService.unreadCount(actorFor(confirmed)), 0);
  });

  test("roster-only updates reach the roster and stay hidden on the page from everyone else", async () => {
    const pending = await makeUser();
    await makeSignup(pending, event, shift, {
      status: "pending",
      pendingReasons: ["approval"],
    });

    await post("Door code 4321", { rosterOnly: true });

    assert.ok(await threadOf(confirmed));
    assert.equal(await threadOf(pending), null);
    const page = (user: Doc<User> | null) =>
      EventService.get(event._id.toString(), user ? actorFor(user) : null);
    assert.equal((await page(confirmed)).updates.length, 1);
    assert.equal((await page(null)).updates.length, 0);
  });

  test("no message email goes out at once; the hourly digest emails only volunteers who haven't read it", async () => {
    const reader = await makeUser({ firstName: "Reader" });
    await makeSignup(reader, event, shift);

    await post();
    assert.equal(sent.length, 0, "a note sends nothing immediately");

    const readerThread = (await threadOf(reader))!;
    await MessageService.getThread(
      actorFor(reader),
      readerThread._id.toString()
    );
    await ageMessages();
    await MessageService.sendDigests();

    assert.deepEqual(
      sent.map((m) => m.to),
      [confirmed.email]
    );
    sent.length = 0;
    await MessageService.sendDigests();
    assert.equal(sent.length, 0, "each message is only emailed once");
  });

  test("an important change still sends its own email", async () => {
    await post("Start moved to 10 AM.", { kind: "important" });

    assert.deepEqual(
      sent.map((m) => m.subject),
      [`Important change: ${event.title}`]
    );
    assert.ok(await threadOf(confirmed));
  });

  test("a roster larger than the hourly message limit is not rate limited", async () => {
    for (let i = 0; i < MAX_MESSAGES_PER_HOUR; i += 1) {
      await makeSignup(await makeUser(), event, shift);
    }

    await post();

    const delivered = await MessageDAO.countBySenderSince(
      organizer._id.toString(),
      new Date(Date.now() - 60_000)
    );
    assert.equal(delivered, MAX_MESSAGES_PER_HOUR + 1);
  });

  test("an update an admin posts arrives from the event's organizer", async () => {
    const admin = await makeUser({ role: "admin" });

    await post(undefined, undefined, admin);

    const [message] = await MessageDAO.findByThread(
      (await threadOf(confirmed))!._id
    );
    assert.equal(message.senderId.toString(), organizer._id.toString());
  });

  test("read-only threads are skipped", async () => {
    const { thread } = await MessageService.createThread(actorFor(confirmed), {
      eventId: event._id.toString(),
      body: "Thanks!",
    });
    await MessageThreadDAO.updateById(thread._id, { status: "read_only" });

    await post();

    assert.equal((await MessageDAO.findByThread(thread._id)).length, 1);
  });

  test("updates on a draft event are not messaged", async () => {
    ({ event, shift } = await makeEvent(organizer, {
      status: "draft",
    } as Partial<Event>));
    await makeSignup(confirmed, event, shift);

    await post();

    assert.equal(await threadOf(confirmed), null);
  });
});
