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
   * That is anyone with a sign-up pending on clearance who has never been
   * checked or whose last check hit a source error, plus anyone an admin
   * queued for a rerun. Returns how many volunteers were checked.
   */
  static async runDue(): Promise<number> {
    const startedAt = new Date();
    const [pending, queued] = await Promise.all([
      SignupDAO.find({ status: "pending", pendingReasons: "clearance" }),
      ScreeningCheckDAO.findRerunRequested(),
    ]);
    const pendingIds = [
      ...new Set(pending.map((s) => s.volunteerId.toString())),
    ];
    const saved = new Map(
      (await ScreeningCheckDAO.findByUsers(pendingIds)).map((c) => [
        c.userId.toString(),
        c,
      ])
    );
    const due = new Set([
      ...pendingIds.filter((id) => {
        const check = saved.get(id);
        return (
          !check?.results.length ||
          check.results.some(
            (r) => r.outcome === "unavailable" && r.reason === "source_error"
          )
        );
      }),
      ...queued.map((c) => c.userId.toString()),
    ]);
    if (!due.size) return 0;

    const users = await UserDAO.findScreeningSubjects([...due]);
    const results = await checkRegistries(
      users.map((u) => ({
        userId: u._id.toString(),
        firstName: u.firstName,
        lastName: u.lastName,
        dateOfBirth: u.dateOfBirth ?? null,
      }))
    );
    for (const [userId, found] of results) {
      await ScreeningCheckDAO.saveResults(userId, found, startedAt);
    }
    return results.size;
  }

  /** Queues a fresh check for the next hourly run. */
  static async requestRerun(
    admin: Actor,
    userId: string
  ): Promise<Doc<ScreeningCheck>> {
    const user = await UserDAO.findById(userId);
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    const check = await ScreeningCheckDAO.requestRerun(
      user._id,
      admin.id,
      new Date()
    );
    await AuditService.record(
      admin,
      "screening.rerun_requested",
      "user",
      user._id
    );
    return check;
  }
}
