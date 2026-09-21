import mongoose, { Types } from "mongoose";
import AuditLogDAO from "@/db/actions/auditLog";
import EventDAO from "@/db/actions/event";
import ShiftDAO from "@/db/actions/shift";
import SignupDAO from "@/db/actions/signup";
import SignupModel from "@/db/models/signup";
import AdminService from "@/services/admin";
import SignupService from "@/services/signup";

/**
 * Manual acceptance demo for issue #19. Run with the local app and MongoDB up:
 * `npx tsx --env-file=.env.local scripts/issue-19-demo.ts`.
 * It uses seeded volunteers and removes every temporary shift/sign-up in finally.
 */
const BASE = process.env.APP_URL ?? "http://localhost:3000";
const DEMO_PASSWORD = "PinkStem!2026";

interface ResponseResult {
  status: number;
  body: Record<string, unknown>;
}

const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message
) => {
  if (!condition) throw new Error(message);
};

async function login(email: string): Promise<string> {
  const response = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: DEMO_PASSWORD }),
  });
  assert(response.ok, `Could not log in ${email}: ${response.status}`);
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  assert(cookie, `Login for ${email} did not return a session cookie`);
  return cookie;
}

async function signUp(cookie: string, shiftId: Types.ObjectId) {
  const response = await fetch(`${BASE}/api/v1/signups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ shiftId, acknowledgeOverlap: true }),
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  } satisfies ResponseResult;
}

async function main(): Promise<void> {
  const createdShiftIds: Types.ObjectId[] = [];
  try {
    const [event] = await EventDAO.findAll({
      status: "published",
      requiresApproval: false,
    });
    assert(event, "Seed a published event before running this script");

    const [mayaCookie, priyaCookie] = await Promise.all([
      login("maya@example.com"),
      login("priya@example.com"),
    ]);
    const baseTime = Date.now() + 14 * 24 * 60 * 60_000;
    const createShift = async (label: string, capacity: number) => {
      const offset = createdShiftIds.length * 3 * 60 * 60_000;
      const shift = await ShiftDAO.create({
        eventId: event._id,
        roleName: `Issue 19 demo: ${label}`,
        startsAt: new Date(baseTime + offset),
        endsAt: new Date(baseTime + offset + 60 * 60_000),
        capacity,
        minStaffing: 1,
        requiredSkills: [],
      });
      createdShiftIds.push(shift._id);
      return shift;
    };

    // The duplicate request must fail after changing a filled counter.
    const filledShift = await createShift("filled compensation", 2);
    const filledBefore = await ShiftDAO.findById(filledShift._id);
    const filledResponses = await Promise.all([
      signUp(mayaCookie, filledShift._id),
      signUp(mayaCookie, filledShift._id),
    ]);
    const filledAfter = await ShiftDAO.findById(filledShift._id);
    const filledSignups = await SignupDAO.find({ shiftId: filledShift._id });
    assert(
      filledResponses.filter((response) => response.status === 201).length ===
        1,
      "Expected exactly one filled-spot request to succeed"
    );
    assert(
      filledResponses.some((response) => response.status === 500),
      "The duplicate did not reach the unique-index failure; rerun the demo"
    );
    assert(
      filledAfter?.filledCount === 1 && filledSignups.length === 1,
      "Filled-count compensation did not restore the counter"
    );

    // Fill the shift first so both duplicate requests definitely take the
    // waitlist path and the failed insert must undo its waitlist increment.
    const waitlistShift = await createShift("waitlist compensation", 1);
    const waitlistPrefill = await signUp(priyaCookie, waitlistShift._id);
    assert(
      waitlistPrefill.status === 201,
      "Could not fill the shift before the waitlist scenario"
    );
    const waitlistBefore = await ShiftDAO.findById(waitlistShift._id);
    const waitlistResponses = await Promise.all([
      signUp(mayaCookie, waitlistShift._id),
      signUp(mayaCookie, waitlistShift._id),
    ]);
    const waitlistAfter = await ShiftDAO.findById(waitlistShift._id);
    const waitlistSignups = await SignupDAO.find({
      shiftId: waitlistShift._id,
    });
    assert(
      waitlistResponses.filter((response) => response.status === 201).length ===
        1,
      "Expected exactly one waitlist scenario request to succeed"
    );
    assert(
      waitlistResponses.some((response) => response.status === 500),
      "The duplicate did not reach the unique-index failure; rerun the demo"
    );
    assert(
      waitlistAfter?.filledCount === 1 &&
        waitlistAfter.waitlistCount === 1 &&
        waitlistSignups.length === 2,
      "Waitlist compensation did not restore the counter"
    );

    // Two different volunteers still compete safely for the final spot.
    const lastSpotShift = await createShift("last spot", 1);
    const lastSpotBefore = await ShiftDAO.findById(lastSpotShift._id);
    const lastSpotResponses = await Promise.all([
      signUp(mayaCookie, lastSpotShift._id),
      signUp(priyaCookie, lastSpotShift._id),
    ]);
    const lastSpotAfter = await ShiftDAO.findById(lastSpotShift._id);
    const lastSpotSignups = await SignupDAO.find({
      shiftId: lastSpotShift._id,
    });
    const lastSpotStatuses = lastSpotSignups.map((signup) => signup.status);
    assert(
      lastSpotResponses.every((response) => response.status === 201),
      "Expected both different-volunteer requests to succeed"
    );
    assert(
      lastSpotAfter?.filledCount === 1 &&
        lastSpotAfter.waitlistCount === 1 &&
        lastSpotStatuses.includes("confirmed") &&
        lastSpotStatuses.includes("waitlisted"),
      "Last-spot behavior did not produce one confirmed and one waitlisted"
    );

    // Reconciliation reports first, then repairs once and becomes a no-op.
    const reconciliationShift = await createShift("reconciliation", 2);
    const reconciliationBefore = await ShiftDAO.findById(
      reconciliationShift._id
    );
    await ShiftDAO.updateById(reconciliationShift._id, {
      filledCount: 3,
      waitlistCount: 2,
    });
    const reportOnly = await SignupService.reconcileCounters();
    const afterReportOnly = await ShiftDAO.findById(reconciliationShift._id);
    const corrected = await SignupService.reconcileCounters({ correct: true });
    const afterCorrection = await ShiftDAO.findById(reconciliationShift._id);
    const repeated = await SignupService.reconcileCounters({ correct: true });
    const auditRows = await AuditLogDAO.findAll(
      {
        action: "shift.counters_reconciled",
        entityType: "shift",
        entityId: reconciliationShift._id,
      },
      1
    );
    const [audit] = await AdminService.withActors(auditRows);
    assert(
      afterReportOnly?.filledCount === 3 && afterReportOnly.waitlistCount === 2,
      "Report-only reconciliation unexpectedly changed the shift"
    );
    assert(
      afterCorrection?.filledCount === 0 && afterCorrection.waitlistCount === 0,
      "Correction mode did not repair the shift"
    );
    assert(
      repeated.filter((result) => result.corrected).length === 0,
      "Repeated reconciliation was not a no-op"
    );
    assert(
      audit?.actorName === "Scheduled job",
      "The audit row did not render the scheduled-job actor"
    );

    console.log(
      JSON.stringify(
        {
          filledCompensation: {
            before: filledBefore,
            responses: filledResponses,
            after: filledAfter,
            signupCount: filledSignups.length,
          },
          waitlistCompensation: {
            before: waitlistBefore,
            prefillResponse: waitlistPrefill,
            responses: waitlistResponses,
            after: waitlistAfter,
            signupCount: waitlistSignups.length,
          },
          lastSpot: {
            before: lastSpotBefore,
            responses: lastSpotResponses,
            after: lastSpotAfter,
            signupStatuses: lastSpotStatuses,
          },
          reconciliation: {
            before: reconciliationBefore,
            corrupted: { filledCount: 3, waitlistCount: 2 },
            reportOnly: reportOnly.find(
              (result) =>
                result.shiftId.toString() === reconciliationShift._id.toString()
            ),
            storedAfterReportOnly: afterReportOnly,
            correction: corrected.find(
              (result) =>
                result.shiftId.toString() === reconciliationShift._id.toString()
            ),
            storedAfterCorrection: afterCorrection,
            repeatedRunCorrections: repeated.filter(
              (result) => result.corrected
            ).length,
            audit: audit && {
              actorName: audit.actorName,
              action: audit.action,
              before: audit.before,
              after: audit.after,
            },
          },
        },
        null,
        2
      )
    );
  } finally {
    // Test fixtures are isolated by shift ID and always removed.
    if (createdShiftIds.length) {
      await SignupModel.deleteMany({ shiftId: { $in: createdShiftIds } });
      for (const shiftId of createdShiftIds) await ShiftDAO.deleteById(shiftId);
    }
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
