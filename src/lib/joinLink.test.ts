/**
 * The join-link rule end to end, against a real MongoDB. Uses its own
 * database (TEST_MONGODB_URI, default a local `pink-stem-test`) and drops it
 * when done. Email is captured instead of sent.
 */
import mongoose from "mongoose";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

process.env.MONGODB_URI =
  process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017/pink-stem-test";
if (!/test/i.test(new URL(process.env.MONGODB_URI).pathname))
  throw new Error(
    "Refusing to run: the test database name must contain 'test'."
  );

const sent = vi.hoisted(
  () => [] as { to: string; text: string; html: string }[]
);
vi.mock("@/services/mail", () => ({
  default: {
    send: async (email: (typeof sent)[number]) => void sent.push(email),
  },
}));

import dbConnect from "@/db/dbConnect";
import EventModel from "@/db/models/event";
import ShiftModel from "@/db/models/shift";
import SignupModel from "@/db/models/signup";
import UserModel from "@/db/models/user";
import { canSeeJoinLink, withoutJoinLink } from "@/lib/joinLink";
import EventService from "@/services/event";
import JobService from "@/services/jobs";
import NotificationService from "@/services/notification";
import SignupService from "@/services/signup";
import type { Actor } from "@/types/auth";
import type { Event, Shift } from "@/types/event";
import type { Doc } from "@/types/models";
import type { Signup, SignupStatus } from "@/types/signup";
import type { Role, SafeUser } from "@/types/user";
import { SIGNUP_STATUSES } from "@/types/signup";

const LINK = "https://zoom.us/j/123456789";
const HOUR = 60 * 60 * 1000;

let n = 0;
async function user(role: Role = "volunteer"): Promise<Doc<SafeUser>> {
  n += 1;
  const doc = await UserModel.create({
    email: `user${n}@example.com`,
    provider: "password",
    role,
    firstName: "Test",
    lastName: `User${n}`,
    emailVerifiedAt: new Date(),
  });
  return doc.toObject() as unknown as Doc<SafeUser>;
}

const actorFor = (u: Doc<SafeUser>): Actor => ({
  id: u._id.toString(),
  role: u.role,
  email: u.email,
  name: `${u.firstName} ${u.lastName}`,
});

let owner: Doc<SafeUser>;
let event: Doc<Event>;
let shift: Doc<Shift>;

async function signup(status: SignupStatus): Promise<{
  volunteer: Doc<SafeUser>;
  signup: Doc<Signup>;
}> {
  const volunteer = await user();
  const doc = await SignupModel.create({
    shiftId: shift._id,
    eventId: event._id,
    volunteerId: volunteer._id,
    status,
    signedUpAt: new Date(Date.now() - HOUR),
  });
  return { volunteer, signup: doc.toObject() as unknown as Doc<Signup> };
}

beforeAll(async () => {
  await dbConnect();
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  sent.length = 0;
  owner = await user("organizer");
  const startsAt = new Date(Date.now() + 30 * HOUR);
  event = (
    await EventModel.create({
      organizerId: owner._id,
      title: "Virtual robotics night",
      description: "Online session",
      programArea: "robotics",
      status: "published",
      visibility: "public",
      eventDate: startsAt,
      region: "metro_atlanta",
      isVirtual: true,
      virtualLink: LINK,
      publishedAt: new Date(),
    })
  ).toObject() as unknown as Doc<Event>;
  shift = (
    await ShiftModel.create({
      eventId: event._id,
      roleName: "Mentor",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 2 * HOUR),
      capacity: 10,
    })
  ).toObject() as unknown as Doc<Shift>;
});

describe("canSeeJoinLink / withoutJoinLink", () => {
  it("allows only confirmed sign-ups", () => {
    for (const status of SIGNUP_STATUSES)
      expect(canSeeJoinLink(status)).toBe(status === "confirmed");
  });

  it("strips the link without touching the original", () => {
    const stripped = withoutJoinLink(event);
    expect(stripped.virtualLink).toBeUndefined();
    expect(event.virtualLink).toBe(LINK);
  });
});

describe("event list", () => {
  it("never includes the join link", async () => {
    const { items } = await EventService.list({});
    const listed = items.find((e) => e._id.toString() === event._id.toString());
    expect(listed).toBeDefined();
    expect(listed!.virtualLink).toBeUndefined();
  });
});

describe("event detail", () => {
  const linkFor = async (actor: Actor | null) =>
    (await EventService.get(event._id.toString(), actor)).virtualLink;

  it("hides the link from anonymous viewers", async () => {
    expect(await linkFor(null)).toBeUndefined();
  });

  it.each(["pending", "waitlisted", "cancelled"] as const)(
    "hides the link from a %s volunteer",
    async (status) => {
      const { volunteer } = await signup(status);
      expect(await linkFor(actorFor(volunteer))).toBeUndefined();
    }
  );

  it("hides the link from a volunteer not signed up", async () => {
    expect(await linkFor(actorFor(await user()))).toBeUndefined();
  });

  it("shows the link to a confirmed volunteer", async () => {
    const { volunteer } = await signup("confirmed");
    expect(await linkFor(actorFor(volunteer))).toBe(LINK);
  });

  it("shows the link to the event's organizer", async () => {
    expect(await linkFor(actorFor(owner))).toBe(LINK);
  });

  it("shows the link to an admin", async () => {
    expect(await linkFor(actorFor(await user("admin")))).toBe(LINK);
  });

  it("hides the link from an organizer of other events", async () => {
    expect(await linkFor(actorFor(await user("organizer")))).toBeUndefined();
  });
});

describe("my sign-ups", () => {
  it.each(["pending", "waitlisted"] as const)(
    "hides the link on a %s sign-up",
    async (status) => {
      const { volunteer } = await signup(status);
      const [mine] = await SignupService.mine(actorFor(volunteer));
      expect(mine.event.virtualLink).toBeUndefined();
    }
  );

  it("shows the link on a confirmed sign-up", async () => {
    const { volunteer } = await signup("confirmed");
    const [mine] = await SignupService.mine(actorFor(volunteer));
    expect(mine.event.virtualLink).toBe(LINK);
  });
});

describe("emails", () => {
  it("leaves the link out of event details unless asked", () => {
    expect(NotificationService.eventDetails(event, shift).where).not.toContain(
      LINK
    );
    expect(
      NotificationService.eventDetails(event, shift, null, { joinLink: true })
        .where
    ).toContain(LINK);
  });

  it.each([
    ["pending", false],
    ["waitlisted", false],
    ["confirmed", true],
  ] as const)(
    "a %s status email includes the link: %s",
    async (status, shown) => {
      const { volunteer, signup: s } = await signup(status);
      await SignupService["notifyStatus"](volunteer, event, shift, s);
      const email = sent.find((e) => e.to === volunteer.email);
      expect(email).toBeDefined();
      expect(email!.text.includes(LINK)).toBe(shown);
      expect(email!.html.includes(LINK)).toBe(shown);
    }
  );

  it("reminders, which go only to confirmed volunteers, include the link", async () => {
    const { volunteer: confirmed } = await signup("confirmed");
    const { volunteer: pending } = await signup("pending");
    await JobService.sendReminders();
    expect(sent.find((e) => e.to === confirmed.email)?.text).toContain(LINK);
    expect(sent.some((e) => e.to === pending.email)).toBe(false);
  });
});

describe("calendar file", () => {
  it.each([
    ["pending", false],
    ["waitlisted", false],
    ["confirmed", true],
  ] as const)(
    "a %s sign-up's calendar includes the link: %s",
    async (status, shown) => {
      const { volunteer, signup: s } = await signup(status);
      const ics = await SignupService.calendar(
        actorFor(volunteer),
        s._id.toString()
      );
      // Lines in an .ics file can be folded, so unfold before searching.
      expect(ics.replace(/\r?\n[ \t]/g, "").includes(LINK)).toBe(shown);
    }
  );
});
