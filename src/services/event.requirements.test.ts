import assert from "node:assert/strict";
import { beforeEach, describe, mock, test } from "node:test";
import EventDAO from "@/db/actions/event";
import SignupDAO from "@/db/actions/signup";
import EventService from "@/services/event";
import MailService from "@/services/mail";
import {
  actorFor,
  clear,
  eventForm,
  makeEvent,
  makeSignup,
  makeUser,
  setupTestDatabase,
} from "@/test/setup";
import type { Event, Shift } from "@/types/event";
import type { Doc } from "@/types/models";
import type { User } from "@/types/user";

const { sent } = setupTestDatabase();

describe("EventService.update re-checks sign-ups when requirements change", () => {
  let organizer: Doc<User>;
  let event: Doc<Event>;
  let shift: Doc<Shift>;

  beforeEach(async () => {
    organizer = await makeUser({ role: "organizer" });
    ({ event, shift } = await makeEvent(organizer));
  });

  const save = (changes: Partial<Event>) =>
    EventService.update(
      actorFor(organizer),
      event._id.toString(),
      eventForm(event, changes)
    );
  const reload = async (id: unknown) => (await SignupDAO.findById(String(id)))!;

  test("turning clearance on puts uncleared confirmed volunteers on hold", async () => {
    const uncleared = await makeUser({ firstName: "Una" });
    const cleared = await makeUser({ firstName: "Clea" });
    await clear(cleared, organizer);
    const a = await makeSignup(uncleared, event, shift);
    const b = await makeSignup(cleared, event, shift);

    const saved = await save({ requiresClearance: true });

    const lapsed = await reload(a._id);
    assert.equal(lapsed.status, "pending");
    assert.deepEqual(lapsed.pendingReasons, ["clearance"]);
    assert.ok(lapsed.holdUntil && lapsed.holdUntil > new Date());
    assert.equal((await reload(b._id)).status, "confirmed");
    // The spot is kept, not released.
    assert.equal(saved.shifts[0].filledCount, 2);
    assert.ok(sent.some((m) => m.to === uncleared.email));
    assert.ok(!sent.some((m) => m.to === cleared.email));
  });

  test("turning clearance off confirms anyone only waiting on it", async () => {
    ({ event, shift } = await makeEvent(organizer, {
      requiresClearance: true,
    }));
    const volunteer = await makeUser();
    const signup = await makeSignup(volunteer, event, shift, {
      status: "pending",
      pendingReasons: ["clearance"],
      holdUntil: new Date(Date.now() + 86_400_000),
    });

    await save({ requiresClearance: false });

    const after = await reload(signup._id);
    assert.equal(after.status, "confirmed");
    assert.deepEqual(after.pendingReasons, []);
    assert.equal(after.holdUntil, null);
    const mail = sent.find((m) => m.to === volunteer.email);
    assert.ok(mail, "a confirmation email is sent");
    assert.match(mail.subject, /confirmed/i);
  });

  test("turning approval off confirms anyone only waiting on it", async () => {
    ({ event, shift } = await makeEvent(organizer, { requiresApproval: true }));
    const volunteer = await makeUser();
    const signup = await makeSignup(volunteer, event, shift, {
      status: "pending",
      pendingReasons: ["approval"],
    });

    await save({ requiresApproval: false });

    assert.equal((await reload(signup._id)).status, "confirmed");
    assert.ok(sent.some((m) => m.to === volunteer.email));
  });

  test("turning one requirement off keeps a volunteer pending on the other", async () => {
    ({ event, shift } = await makeEvent(organizer, {
      requiresClearance: true,
      requiresApproval: true,
    }));
    const volunteer = await makeUser();
    const signup = await makeSignup(volunteer, event, shift, {
      status: "pending",
      pendingReasons: ["clearance", "approval"],
    });

    await save({ requiresClearance: false });

    const after = await reload(signup._id);
    assert.equal(after.status, "pending");
    assert.deepEqual(after.pendingReasons, ["approval"]);
    assert.equal(sent.length, 0);
  });

  test("turning approval on leaves confirmed sign-ups alone", async () => {
    const volunteer = await makeUser();
    const signup = await makeSignup(volunteer, event, shift);

    await save({ requiresApproval: true });

    assert.equal((await reload(signup._id)).status, "confirmed");
    assert.equal(sent.length, 0);
  });

  test("a grandfathered volunteer who later loses clearance is not asked for approval", async () => {
    const volunteer = await makeUser();
    const signup = await makeSignup(volunteer, event, shift);
    await save({ requiresApproval: true });
    event = { ...event, requiresApproval: true };

    await save({ requiresClearance: true });

    const after = await reload(signup._id);
    assert.equal(after.status, "pending");
    assert.deepEqual(after.pendingReasons, ["clearance"]);
  });

  test("draft events are not re-checked", async () => {
    ({ event, shift } = await makeEvent(organizer, {
      status: "draft",
    } as Partial<Event>));
    const volunteer = await makeUser();
    const signup = await makeSignup(volunteer, event, shift);

    await save({ requiresClearance: true });

    assert.equal((await reload(signup._id)).status, "confirmed");
  });

  test("removing clearance ends a hold even when approval still blocks the spot", async () => {
    ({ event, shift } = await makeEvent(organizer, {
      requiresClearance: true,
      requiresApproval: true,
    }));
    const volunteer = await makeUser();
    const signup = await makeSignup(volunteer, event, shift, {
      status: "pending",
      pendingReasons: ["clearance", "approval"],
      holdUntil: new Date(Date.now() + 86_400_000),
    });

    await save({ requiresClearance: false });

    const after = await reload(signup._id);
    assert.equal(after.status, "pending");
    assert.deepEqual(after.pendingReasons, ["approval"]);
    assert.equal(after.holdUntil, null, "expireHolds can no longer release it");
  });

  test("a failing email does not stop the rest of the roster from being re-checked", async () => {
    const first = await makeUser();
    const second = await makeUser();
    const a = await makeSignup(first, event, shift);
    const b = await makeSignup(second, event, shift);
    const failing = mock.method(MailService, "send", async () => {
      throw new Error("mail provider is down");
    });
    const quiet = mock.method(console, "error", () => {});
    try {
      await save({ requiresClearance: true });
    } finally {
      failing.mock.restore();
      quiet.mock.restore();
    }

    assert.equal((await reload(a._id)).status, "pending");
    assert.equal((await reload(b._id)).status, "pending");
  });

  test("a re-check that was cut short is finished by the next save", async () => {
    const volunteer = await makeUser();
    const signup = await makeSignup(volunteer, event, shift);
    // The flag was saved but the roster was never updated.
    await EventDAO.updateById(event._id, { requiresClearance: true });
    event = { ...event, requiresClearance: true };

    await save({ title: "Same requirements, saved again" });

    assert.equal((await reload(signup._id)).status, "pending");
  });

  describe("minimum age", () => {
    test("raising it past a signed-up volunteer is refused and names them", async () => {
      const teen = await makeUser({
        firstName: "Tess",
        lastName: "Young",
        dateOfBirth: new Date(Date.now() - 15.5 * 365.25 * 86_400_000),
      });
      await makeSignup(teen, event, shift);

      await assert.rejects(save({ minAge: 18 }), (error: Error) => {
        assert.match(error.message, /can't be raised to 18/);
        assert.match(error.message, /Tess Young/);
        return true;
      });
    });

    test("a waitlisted volunteer counts as signed up", async () => {
      const teen = await makeUser({
        dateOfBirth: new Date(Date.now() - 15.5 * 365.25 * 86_400_000),
      });
      await makeSignup(teen, event, shift, { status: "waitlisted" });

      await assert.rejects(save({ minAge: 16 }));
    });

    test("raising it is allowed when everyone signed up meets it", async () => {
      const adult = await makeUser();
      const teen = await makeUser({
        dateOfBirth: new Date(Date.now() - 15.5 * 365.25 * 86_400_000),
      });
      await makeSignup(adult, event, shift);
      await makeSignup(teen, event, shift, { status: "cancelled" });

      const saved = await save({ minAge: 18 });
      assert.equal(saved.minAge, 18);
    });

    test("an unrelated edit is not blocked by an existing under-age sign-up", async () => {
      ({ event, shift } = await makeEvent(organizer, { minAge: 18 }));
      const teen = await makeUser({
        dateOfBirth: new Date(Date.now() - 15.5 * 365.25 * 86_400_000),
      });
      await makeSignup(teen, event, shift);

      const saved = await save({ title: "Renamed" });
      assert.equal(saved.title, "Renamed");
    });
  });
});
