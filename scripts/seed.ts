/**
 * Seeds the database for local development and first deploys.
 *
 *   npm run seed          creates org settings and the first admin
 *   npm run seed -- demo  also adds an organizer, volunteers, and sample events
 *   npm run seed:staging  the demo seed, against .env.staging.local
 *
 * The admin email and password come from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 * Demo accounts use SEED_DEMO_PASSWORD when set, so a hosted database never
 * runs on the password committed here. Re-running is safe: existing accounts
 * are left alone.
 *
 * Any database that is not on this machine has to be confirmed by typing its
 * name first. A MONGODB_URI exported in the shell beats the one in the env
 * file, so the file alone does not say where the seed is about to write.
 */
import { createInterface } from "node:readline/promises";
import mongoose, { Types } from "mongoose";
import dbConnect from "@/db/dbConnect";
import ClearanceDAO from "@/db/actions/clearance";
import EventDAO from "@/db/actions/event";
import OrgSettingsDAO from "@/db/actions/orgSettings";
import ShiftDAO from "@/db/actions/shift";
import UserDAO from "@/db/actions/user";
import HashingService from "@/services/hashing";
import { addDays, fromDateTimeLocal, toDateInput } from "@/lib/dates";
import type { Doc } from "@/types/models";
import type { Role, User } from "@/types/user";

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "PinkStem!2026";
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

/** Names the target database and, unless it is local, asks before writing. */
async function confirmTarget(): Promise<void> {
  const match = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)\/?([^?]*)/.exec(
    process.env.MONGODB_URI ?? ""
  );
  if (!match) throw new Error("MONGODB_URI is missing or malformed");
  const [, hostList, database] = match;
  const hosts = hostList.split(",").map((h) => h.replace(/:\d+$/, ""));
  console.log(`Seeding "${database || "test"}" on ${hosts.join(", ")}`);
  if (hosts.every((h) => LOCAL_HOSTS.includes(h))) return;

  if (!database) {
    throw new Error(
      "MONGODB_URI names no database, so Mongo would write to `test`. Add it after the host: ...mongodb.net/pink-stem-staging"
    );
  }
  if (!process.stdin.isTTY) {
    throw new Error("Seeding a remote database needs an interactive terminal");
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const typed = await rl.question(
    "Remote database. Type its name to seed it: "
  );
  rl.close();
  if (typed.trim() !== database)
    throw new Error("Name did not match; nothing written");
}

async function ensureUser(
  data: {
    email: string;
    role: Role;
    firstName: string;
    lastName: string;
    password: string;
  } & Partial<User>
): Promise<Doc<User>> {
  const existing = await UserDAO.findAuthByEmail(data.email);
  if (existing) {
    // Databases seeded before email verification existed.
    if (!existing.emailVerifiedAt)
      await UserDAO.updateById(existing._id, { emailVerifiedAt: new Date() });
    return existing;
  }
  const { password, ...rest } = data;
  const created = await UserDAO.create({
    ...rest,
    provider: "password",
    passwordHash: await HashingService.hash(password),
    waiverVersionAccepted: 1,
    waiverAcceptedAt: new Date(),
    emailVerifiedAt: new Date(),
  });
  console.log(`  created ${data.role}: ${data.email}`);
  return { ...created, sessionVersion: 0 };
}

async function main() {
  const demo = process.argv.includes("demo");
  await confirmTarget();
  await dbConnect();
  await OrgSettingsDAO.get();
  console.log("Org settings ready.");

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in the env file"
    );
  }
  const admin = await ensureUser({
    email: adminEmail,
    role: "admin",
    firstName: "Pink STEM",
    lastName: "Admin",
    password: adminPassword,
  });

  if (!demo) return;

  const organizer = await ensureUser({
    email: "organizer@example.com",
    role: "organizer",
    firstName: "Jordan",
    lastName: "Reyes",
    password: DEMO_PASSWORD,
    phone: "(404) 555-0142",
  });
  const volunteers = await Promise.all([
    ensureUser({
      email: "maya@example.com",
      role: "volunteer",
      firstName: "Maya",
      lastName: "Okafor",
      password: DEMO_PASSWORD,
      dateOfBirth: fromDateTimeLocal("1994-03-12"),
      skills: ["robotics", "coding"],
      interests: ["robotics"],
      region: "metro_atlanta",
      city: "Decatur",
    }),
    ensureUser({
      email: "priya@example.com",
      role: "volunteer",
      firstName: "Priya",
      lastName: "Natarajan",
      password: DEMO_PASSWORD,
      dateOfBirth: fromDateTimeLocal("1988-11-02"),
      skills: ["cybersecurity"],
      interests: ["cybersecurity", "coding"],
      region: "metro_atlanta",
      city: "Atlanta",
    }),
    ensureUser({
      email: "sofia@example.com",
      role: "volunteer",
      firstName: "Sofia",
      lastName: "Hernandez",
      password: DEMO_PASSWORD,
      dateOfBirth: fromDateTimeLocal("2009-06-21"),
      guardianEmail: "guardian@example.com",
      skills: ["event_support"],
      interests: ["aviation"],
      region: "middle_georgia",
      city: "Warner Robins",
    }),
  ]);
  // Two adults cleared, the minor still pending clearance.
  for (const v of volunteers.slice(0, 2)) {
    await ClearanceDAO.upsert(v._id, {
      status: "cleared",
      clearedOn: new Date(),
      expiresOn: addDays(new Date(), 365),
      recordedBy: admin._id,
      notes: "Demo seed",
    });
  }

  const existingEvents = await EventDAO.count({ organizerId: organizer._id });
  if (existingEvents) {
    console.log("Demo events already exist.");
    return;
  }

  const day = (offset: number, time: string) =>
    fromDateTimeLocal(`${toDateInput(addDays(new Date(), offset))}T${time}`);
  /** The next Saturday at least `minDays` out, so demo workshops land on a real Saturday. */
  const saturday = (minDays: number, time: string) => {
    const start = addDays(new Date(), minDays);
    return day(minDays + ((6 - start.getDay() + 7) % 7), time);
  };
  const events = [
    {
      title: "Intro to Robotics — Saturday Workshop",
      description:
        "Middle-school girls build and program their first line-following robot. Volunteers coach small tables of three, keep the build moving, and celebrate every working sensor.\n\nNo robotics experience required for check-in and floater roles. Table leads should be comfortable with basic block coding.",
      programArea: "robotics" as const,
      region: "metro_atlanta" as const,
      locationName: "Pink STEM Discovery Lab",
      address: "260 Peachtree St NW, Suite 2200, Atlanta, GA 30303",
      locationNote: "Check in at the 22nd floor reception",
      city: "Atlanta",
      siteContactName: "Jordan Reyes",
      siteContactPhone: "(404) 555-0142",
      eventDate: saturday(10, "09:00"),
      shifts: [
        {
          roleName: "Robotics table lead",
          start: "09:00",
          end: "12:00",
          capacity: 4,
          minStaffing: 3,
          requiredSkills: ["robotics" as const],
        },
        {
          roleName: "Check-in desk",
          start: "08:30",
          end: "10:30",
          capacity: 2,
          minStaffing: 1,
          requiredSkills: [],
        },
        {
          roleName: "Afternoon showcase support",
          start: "12:30",
          end: "15:00",
          capacity: 3,
          minStaffing: 2,
          requiredSkills: ["event_support" as const],
        },
      ],
    },
    {
      title: "CODE-Y-CYBER-U: Capture the Flag Night",
      description:
        "High schoolers work through beginner cybersecurity challenges in teams. Volunteers with a security or IT background float between teams, nudge without solving, and judge the final round.",
      programArea: "cybersecurity" as const,
      region: "middle_georgia" as const,
      locationName: "Pink STEM Warner Robins Office",
      address: "110 Clay St, Warner Robins, GA 31088",
      city: "Warner Robins",
      siteContactName: "Jordan Reyes",
      siteContactPhone: "(404) 555-0142",
      eventDate: day(19, "17:30"),
      shifts: [
        {
          roleName: "Challenge mentor",
          start: "17:30",
          end: "20:30",
          capacity: 5,
          minStaffing: 3,
          requiredSkills: ["cybersecurity" as const, "coding" as const],
        },
        {
          roleName: "Judge",
          start: "19:30",
          end: "21:00",
          capacity: 2,
          minStaffing: 2,
          requiredSkills: ["cybersecurity" as const],
        },
      ],
    },
    {
      title: "Virtual Coding Class: Python Basics",
      description:
        "A live online session for middle and high school students. Volunteers monitor breakout rooms, answer questions in chat, and help students who fall behind catch up.",
      programArea: "coding" as const,
      region: "other" as const,
      isVirtual: true,
      virtualLink: "https://meet.google.com/pink-stem-demo",
      requiresClearance: true,
      eventDate: day(6, "18:00"),
      shifts: [
        {
          roleName: "Breakout room helper",
          start: "18:00",
          end: "19:30",
          capacity: 6,
          minStaffing: 2,
          requiredSkills: ["coding" as const],
        },
      ],
    },
  ];

  for (const { shifts, ...event } of events) {
    const created = await EventDAO.create({
      ...event,
      organizerId: organizer._id as Types.ObjectId,
      status: "published",
      visibility: "public",
      isVirtual: event.isVirtual ?? false,
      requiresClearance: event.requiresClearance ?? true,
      requiresApproval: false,
      publishedAt: new Date(),
    });
    const base = toDateInput(event.eventDate);
    await ShiftDAO.createMany(
      shifts.map((s) => ({
        eventId: created._id,
        roleName: s.roleName,
        startsAt: fromDateTimeLocal(`${base}T${s.start}`),
        endsAt: fromDateTimeLocal(`${base}T${s.end}`),
        capacity: s.capacity,
        minStaffing: s.minStaffing,
        requiredSkills: s.requiredSkills,
      }))
    );
    console.log(`  created event: ${created.title}`);
  }
  console.log(`\nDemo accounts use the password ${DEMO_PASSWORD}`);
}

main()
  .then(() => mongoose.disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
