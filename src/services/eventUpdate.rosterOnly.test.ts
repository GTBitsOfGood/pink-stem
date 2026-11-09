import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import EventService from "@/services/event";
import EventUpdateService from "@/services/eventUpdate";
import SignupService from "@/services/signup";
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

describe("roster-only updates reach confirmed volunteers only", () => {
  let organizer: Doc<User>;
  let event: Doc<Event>;
  let shift: Doc<Shift>;
  let confirmed: Doc<User>;
  let pending: Doc<User>;
  let waitlisted: Doc<User>;

  beforeEach(async () => {
    organizer = await makeUser({ role: "organizer" });
    ({ event, shift } = await makeEvent(organizer));
    confirmed = await makeUser({ firstName: "Confirmed" });
    pending = await makeUser({ firstName: "Pending" });
    waitlisted = await makeUser({ firstName: "Waitlisted" });
    await makeSignup(confirmed, event, shift);
    await makeSignup(pending, event, shift, {
      status: "pending",
      pendingReasons: ["approval"],
    });
    await makeSignup(waitlisted, event, shift, { status: "waitlisted" });
  });

  const post = (kind: "note" | "important", rosterOnly: boolean) =>
    EventUpdateService.create(actorFor(organizer), event._id.toString(), {
      kind,
      body: `${kind} ${rosterOnly ? "door code 4321" : "for everyone"}`,
      rosterOnly,
    });
  const seesDoorCode = async (user: Doc<User>) =>
    (await EventService.get(event._id.toString(), actorFor(user))).updates.some(
      (u) => u.rosterOnly
    );
  const recipients = () => sent.map((m) => m.to).sort();

  test("the event page shows roster-only updates to confirmed volunteers, organizers and admins", async () => {
    await post("note", true);
    const admin = await makeUser({ role: "admin" });

    assert.equal(await seesDoorCode(confirmed), true);
    assert.equal(await seesDoorCode(organizer), true);
    assert.equal(await seesDoorCode(admin), true);
    assert.equal(await seesDoorCode(pending), false);
    assert.equal(await seesDoorCode(waitlisted), false);
    assert.equal(
      (await EventService.get(event._id.toString(), null)).updates.length,
      0
    );
  });

  test("a volunteer confirmed later sees roster-only updates from then on", async () => {
    await post("note", true);
    const late = await makeUser();
    const signup = await makeSignup(late, event, shift, {
      status: "pending",
      pendingReasons: ["approval"],
    });
    assert.equal(await seesDoorCode(late), false);

    await SignupService.approve(actorFor(organizer), signup._id.toString());

    assert.equal(await seesDoorCode(late), true);
  });

  test("a roster-only important change is emailed to confirmed volunteers only", async () => {
    await post("important", true);
    assert.deepEqual(recipients(), [confirmed.email]);
  });

  test("an important change that isn't roster-only is emailed to everyone signed up, pending included", async () => {
    await post("important", false);
    assert.deepEqual(
      recipients(),
      [confirmed.email, pending.email, waitlisted.email].sort()
    );
  });

  test("roster-only notes only go into confirmed volunteers' digest", async () => {
    await post("note", true);
    await post("note", false);

    await EventUpdateService.sendNoteDigest();

    const digest = (to: string) => sent.find((m) => m.to === to)?.text ?? "";
    assert.match(digest(confirmed.email), /door code 4321/);
    assert.match(digest(confirmed.email), /for everyone/);
    for (const user of [pending, waitlisted]) {
      assert.match(digest(user.email), /for everyone/);
      assert.doesNotMatch(digest(user.email), /door code 4321/);
    }
  });

  test("a digest of only roster-only notes skips volunteers who aren't confirmed", async () => {
    await post("note", true);

    await EventUpdateService.sendNoteDigest();

    assert.deepEqual(recipients(), [confirmed.email]);
  });

  test("old roster-only notes are not emailed to someone confirmed after the digest", async () => {
    await post("note", true);
    await EventUpdateService.sendNoteDigest();
    sent.length = 0;

    await EventUpdateService.sendNoteDigest();

    assert.equal(sent.length, 0);
  });
});
