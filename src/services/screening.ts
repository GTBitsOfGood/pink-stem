import ScreeningCheckDAO from "@/db/actions/screeningCheck";
import SignupDAO from "@/db/actions/signup";
import UserDAO from "@/db/actions/user";
import { checkRegistries } from "@/lib/screening";
import AuditService from "@/services/audit";
import type { Actor } from "@/types/auth";
import { NotFoundError } from "@/types/exceptions";
import type { Doc } from "@/types/models";
import type { ScreeningCheck } from "@/types/screening";
import ERRORS from "@/utils/errorMessages";

/**
 * The registry pre-check, saved for admins. It runs lookups only from the
 * hourly job, never inside a request, and it never changes clearance: the
 * admin reads the result and still decides. Nothing here logs names or results.
 */
export default class ScreeningService {
  /**
   * Scheduled: checks every volunteer who needs it and saves the results.
   * That is anyone with a sign-up pending on clearance who has not been
   * checked since that sign-up or their profile last changed, or whose last
   * check hit a source error, plus anyone an admin queued for a rerun.
   * Returns how many volunteers were checked.
   */
  static async runDue(): Promise<number> {
    const startedAt = new Date();
    const [pending, queued] = await Promise.all([
      SignupDAO.find({ status: "pending", pendingReasons: "clearance" }),
      ScreeningCheckDAO.findRerunRequested(),
    ]);
    // When each volunteer's pending sign-ups last changed.
    const signupsChanged = new Map<string, number>();
    for (const signup of pending) {
      const id = signup.volunteerId.toString();
      signupsChanged.set(
        id,
        Math.max(signupsChanged.get(id) ?? 0, +signup.updatedAt)
      );
    }
    const queuedIds = new Set(queued.map((c) => c.userId.toString()));
    const ids = [...new Set([...signupsChanged.keys(), ...queuedIds])];
    const [users, checks] = await Promise.all([
      UserDAO.findScreeningSubjects(ids),
      ScreeningCheckDAO.findByUsers(ids),
    ]);
    const saved = new Map(checks.map((c) => [c.userId.toString(), c.results]));

    const due = users.filter((u) => {
      const id = u._id.toString();
      const results = saved.get(id) ?? [];
      if (queuedIds.has(id) || !results.length) return true;
      if (
        results.some(
          (r) => r.outcome === "unavailable" && r.reason === "source_error"
        )
      )
        return true;
      // A new sign-up, or a changed name or date of birth, needs a fresh look.
      const checkedAt = Math.min(...results.map((r) => +r.checkedAt));
      return Math.max(+u.updatedAt, signupsChanged.get(id) ?? 0) > checkedAt;
    });
    if (!due.length) return 0;

    const results = await checkRegistries(
      due.map((u) => ({
        userId: u._id.toString(),
        firstName: u.firstName,
        lastName: u.lastName,
        dateOfBirth: u.dateOfBirth ?? null,
      }))
    );
    await Promise.all(
      [...results].map(([userId, found]) =>
        ScreeningCheckDAO.saveResults(userId, found, startedAt)
      )
    );
    return results.size;
  }

  /** Queues a fresh check for the next hourly run. */
  static async requestRerun(
    admin: Actor,
    userId: string
  ): Promise<Doc<ScreeningCheck>> {
    const user = await UserDAO.findById(userId);
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    const check = await ScreeningCheckDAO.requestRerun(user._id, new Date());
    await AuditService.record(
      admin,
      "screening.rerun_requested",
      "user",
      user._id
    );
    return check;
  }
}
