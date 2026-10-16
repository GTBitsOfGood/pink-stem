import ScreeningCheckDAO from "@/db/actions/screeningCheck";
import SignupDAO from "@/db/actions/signup";
import UserDAO from "@/db/actions/user";
import { checkRegistries } from "@/lib/screening";
import AuditService from "@/services/audit";
import type { Actor } from "@/types/auth";
import { NotFoundError } from "@/types/exceptions";
import type { Doc } from "@/types/models";
import type {
  RegistryUnavailableReason,
  ScreeningCheck,
} from "@/types/screening";
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
   * checked, whose last check hit a source error, or who had no date of birth
   * then and has one now, plus anyone an admin queued for a rerun. Returns
   * how many volunteers were checked.
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
    const queuedIds = new Set(queued.map((c) => c.userId.toString()));
    const saved = new Map(
      (await ScreeningCheckDAO.findByUsers(pendingIds)).map((c) => [
        c.userId.toString(),
        c,
      ])
    );
    const users = await UserDAO.findScreeningSubjects([
      ...new Set([...pendingIds, ...queuedIds]),
    ]);

    const failed = (id: string, reason: RegistryUnavailableReason) =>
      saved
        .get(id)
        ?.results.some(
          (r) => r.outcome === "unavailable" && r.reason === reason
        );
    const due = users.filter((u) => {
      const id = u._id.toString();
      if (queuedIds.has(id)) return true;
      if (!saved.get(id)?.results.length) return true;
      if (failed(id, "source_error")) return true;
      const hasDob =
        !!u.dateOfBirth && !Number.isNaN(new Date(u.dateOfBirth).getTime());
      return hasDob && failed(id, "missing_dob");
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
