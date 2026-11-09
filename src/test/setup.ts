import { randomUUID } from "node:crypto";
import { after, before, beforeEach, mock } from "node:test";
import mongoose, { Types } from "mongoose";
import dbConnect from "@/db/dbConnect";
import ClearanceDAO from "@/db/actions/clearance";
import EventDAO from "@/db/actions/event";
import ShiftDAO from "@/db/actions/shift";
import SignupDAO from "@/db/actions/signup";
import UserDAO from "@/db/actions/user";
import { addDays } from "@/lib/dates";
import MailService, { type OutgoingEmail } from "@/services/mail";
import type { Actor } from "@/types/auth";
import type { Event, Shift } from "@/types/event";
import type { Doc } from "@/types/models";
import type { Signup } from "@/types/signup";
import type { Role, User } from "@/types/user";

/**
 * Points the services at a throwaway database on the local Mongo (or
 * TEST_MONGODB_URI), empties it between tests and drops it at the end.
 * Mail is captured instead of sent; read it from the returned `sent` array.
 */
export function setupTestDatabase(): { sent: OutgoingEmail[] } {
  const base = (
    process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017"
  ).replace(/\/+$/, "");
  process.env.MONGODB_URI = `${base}/pink-stem-test-${randomUUID().slice(0, 8)}`;
  delete process.env.RESEND_API_KEY;

  const sent: OutgoingEmail[] = [];
  before(async () => {
    await dbConnect();
    mock.method(MailService, "send", async (email: OutgoingEmail) => {
      sent.push(email);
    });
  });
  beforeEach(async () => {
    sent.length = 0;
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });
  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  return { sent };
}

export async function makeUser(
  overrides: Partial<User> & { role?: Role } = {}
): Promise<Doc<User>> {
  const id = randomUUID().slice(0, 8);
  return UserDAO.create({
    email: `user-${id}@example.com`,
    provider: "password",
    passwordHash: "x",
    firstName: "Test",
    lastName: id,
    role: "volunteer",
    status: "active",
    emailVerifiedAt: new Date(),
    dateOfBirth: new Date("1990-01-01T00:00:00Z"),
    ...overrides,
  } as Parameters<typeof UserDAO.create>[0]);
}

export const actorFor = (user: Doc<User>): Actor => ({
  id: user._id.toString(),
  role: user.role,
  email: user.email,
  name: `${user.firstName} ${user.lastName}`,
});

export async function clear(user: Doc<User>, recordedBy: Doc<User>) {
  await ClearanceDAO.upsert(user._id, {
    status: "cleared",
    clearedOn: new Date(),
    expiresOn: addDays(new Date(), 365),
    recordedBy: recordedBy._id,
  });
}

/** A published, in-person event ten days out with one shift. */
export async function makeEvent(
  organizer: Doc<User>,
  overrides: Partial<Event> = {}
): Promise<{ event: Doc<Event>; shift: Doc<Shift> }> {
  const day = addDays(new Date(), 10);
  day.setUTCHours(16, 0, 0, 0);
  const event = await EventDAO.create({
    organizerId: organizer._id as Types.ObjectId,
    title: "Test event",
    description: "A test event",
    programArea: "robotics",
    visibility: "public",
    status: "published",
    publishedAt: new Date(),
    eventDate: day,
    region: "metro_atlanta",
    isVirtual: false,
    locationName: "Lab",
    address: "1 Main St",
    requiresClearance: false,
    requiresApproval: false,
    ...overrides,
  } as Parameters<typeof EventDAO.create>[0]);
  const [shift] = await ShiftDAO.createMany([
    {
      eventId: event._id,
      roleName: "Helper",
      startsAt: day,
      endsAt: new Date(day.getTime() + 2 * 3_600_000),
      capacity: 5,
      minStaffing: 1,
      requiredSkills: [],
    },
  ]);
  return { event, shift };
}

/** Writes a sign-up directly, holding a spot when it is pending or confirmed. */
export async function makeSignup(
  volunteer: Doc<User>,
  event: Doc<Event>,
  shift: Doc<Shift>,
  overrides: Partial<Signup> = {}
): Promise<Doc<Signup>> {
  const status = overrides.status ?? "confirmed";
  if (status === "pending" || status === "confirmed")
    await ShiftDAO.claimSpot(shift._id.toString());
  else if (status === "waitlisted")
    await ShiftDAO.adjustWaitlist(shift._id.toString(), 1);
  return SignupDAO.create({
    shiftId: shift._id,
    eventId: event._id,
    volunteerId: volunteer._id as Types.ObjectId,
    status,
    pendingReasons: [],
    signedUpAt: new Date(),
    waiverSignedAt: new Date(),
    confirmedAt: status === "confirmed" ? new Date() : null,
    ...overrides,
  } as Parameters<typeof SignupDAO.create>[0]);
}

/** The full form body the event edit page sends, built from a saved event. */
export const eventForm = (event: Doc<Event>, changes: Partial<Event> = {}) => {
  const e = { ...event, ...changes };
  return {
    title: e.title,
    description: e.description,
    programArea: e.programArea,
    visibility: e.visibility,
    eventDate: e.eventDate.toISOString(),
    region: e.region,
    isVirtual: e.isVirtual,
    virtualLink: e.virtualLink ?? "",
    locationName: e.locationName ?? "",
    address: e.address ?? "",
    city: e.city ?? "",
    requiresClearance: e.requiresClearance,
    requiresApproval: e.requiresApproval,
    minAge: e.minAge ?? null,
  };
};
