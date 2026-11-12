import { Types } from "mongoose";
import ActionTokenDAO from "@/db/actions/actionToken";
import AuditLogDAO from "@/db/actions/auditLog";
import CertificateDAO from "@/db/actions/certificate";
import ClearanceDAO from "@/db/actions/clearance";
import ApprovalDAO from "@/db/actions/approval";
import HoursLedgerDAO from "@/db/actions/hoursLedger";
import MessageThreadDAO from "@/db/actions/messageThread";
import ScreeningCheckDAO from "@/db/actions/screeningCheck";
import SignupDAO from "@/db/actions/signup";
import UserDAO from "@/db/actions/user";
import { ORGANIZER_INVITE_DAYS, PAGE_SIZE } from "@/constants/limits";
import { appUrl } from "@/lib/urls";
import AuditService from "@/services/audit";
import HoursService from "@/services/hours";
import MessageService from "@/services/message";
import NotificationService from "@/services/notification";
import SignupService from "@/services/signup";
import type {
  AdminApprovals,
  AuditRow,
  Paginated,
  PersonDetail,
  PersonRow,
} from "@/types/api";
import type { Actor } from "@/types/auth";
import type { Event } from "@/types/event";
import type { MessageThread } from "@/types/message";
import {
  ConflictError,
  IllegalOperationError,
  NotFoundError,
} from "@/types/exceptions";
import type { Doc } from "@/types/models";
import type { SafeUser } from "@/types/user";
import {
  SCHEDULED_JOB_ACTOR_ID,
  SYSTEM_ACTOR_ID,
  type AuditLog,
} from "@/types/audit";
import { sameId } from "@/utils/authorization";
import ERRORS from "@/utils/errorMessages";
import {
  auditFiltersSchema,
  approvalFiltersSchema,
  inviteSchema,
  peopleFiltersSchema,
  updateUserSchema,
} from "@/utils/validation/admin";

/** Audit actors with no user account behind them. */
const RESERVED_ACTOR_NAMES: Record<string, string> = {
  [SCHEDULED_JOB_ACTOR_ID]: "Scheduled job",
  [SYSTEM_ACTOR_ID]: "System",
};

/** Oversight across people, events, and the audit trail. Admin-only routes call in here. */
export default class AdminService {
  /** One bounded page from the selected approval queue, plus every tab count. */
  static async approvals(
    admin: Actor,
    input: Record<string, string | undefined>
  ): Promise<AdminApprovals> {
    const { queue, page: requested } = approvalFiltersSchema.parse(input);
    const now = new Date();
    const counts = await ApprovalDAO.counts(now);
    const total = counts[queue];
    const page = Math.min(requested, Math.max(1, Math.ceil(total / PAGE_SIZE)));
    const items = await ApprovalDAO.page(queue, page, now);
    // Another admin's decision can empty this page between the count and the read.
    if (!items.length && page > 1)
      return AdminService.approvals(admin, { queue, page: String(page - 1) });
    const common = { counts, total, page, pageSize: PAGE_SIZE };
    const byId = (a: { _id: Types.ObjectId }, b: { _id: Types.ObjectId }) =>
      a._id.toString().localeCompare(b._id.toString());

    if (queue === "clearances") {
      const users = await UserDAO.findSummaries(items as Types.ObjectId[]);
      return { ...common, queue, items: users.sort(byId) };
    }
    if (queue === "awaitingClearance") {
      const ids = items as Types.ObjectId[];
      const [volunteers, screenings] = await Promise.all([
        UserDAO.findSummaries(ids),
        ScreeningCheckDAO.findByUsers(ids),
      ]);
      return {
        ...common,
        queue,
        items: volunteers.sort(byId).map((volunteer) => ({
          volunteer,
          screening:
            screenings.find((check) => sameId(check.userId, volunteer._id)) ??
            null,
        })),
      };
    }
    if (queue === "rosters") {
      return { ...common, queue, items: items as Doc<Event>[] };
    }
    const threads = items as Doc<MessageThread>[];
    return {
      ...common,
      queue,
      items: await MessageService.summarize(
        admin,
        threads,
        threads.map((thread) => thread._id)
      ),
    };
  }

  static async listPeople(
    input: Record<string, string | undefined>
  ): Promise<Paginated<PersonRow>> {
    const filters = peopleFiltersSchema.parse(input);
    let ids: Types.ObjectId[] | undefined;
    let notIds: Types.ObjectId[] | undefined;
    if (filters.clearance === "none") {
      const recorded = await Promise.all(
        (["submitted", "cleared", "expired"] as const).map((s) =>
          ClearanceDAO.findUserIdsByStatus(s)
        )
      );
      notIds = recorded.flat();
    } else if (filters.clearance) {
      ids = await ClearanceDAO.findUserIdsByStatus(filters.clearance);
    }
    const { items, total } = await UserDAO.search({ ...filters, ids, notIds });
    const [clearances, hours] = await Promise.all([
      ClearanceDAO.findByUsers(items.map((u) => u._id)),
      HoursLedgerDAO.totalsForVolunteers(items.map((u) => u._id)),
    ]);
    return {
      items: items.map((user) => {
        const clearance = clearances.find((c) => sameId(c.userId, user._id));
        return {
          ...user,
          clearanceStatus: clearance?.status ?? "none",
          clearanceExpiresOn: clearance?.expiresOn ?? null,
          hours: hours.get(user._id.toString()) ?? 0,
        };
      }),
      total,
      page: filters.page,
      pageSize: PAGE_SIZE,
    };
  }

  static async getPerson(userId: string): Promise<PersonDetail> {
    const user = await UserDAO.findById(userId);
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    const [clearance, screening, signups, ledger, certificates, threadCount] =
      await Promise.all([
        ClearanceDAO.findByUser(user._id),
        ScreeningCheckDAO.findByUser(user._id),
        SignupDAO.findByVolunteer(user._id),
        HoursLedgerDAO.findByVolunteer(user._id),
        CertificateDAO.findByVolunteer(user._id),
        MessageThreadDAO.count({
          $or: [{ volunteerId: user._id }, { organizerId: user._id }],
        }),
      ]);
    const audit = await AuditLogDAO.findForUser(user._id, {
      clearance: clearance ? [clearance._id] : [],
      ledger: ledger.map((e) => e._id),
      certificate: certificates.map((c) => c._id),
      signup: signups.map((s) => s._id),
    });
    return {
      user,
      clearance,
      screening,
      signups: await SignupService.withContext(signups),
      ledger: await HoursService.withEvents(ledger),
      certificates,
      audit: await AdminService.withActors(audit),
      threadCount,
    };
  }

  static async updateUser(
    admin: Actor,
    userId: string,
    input: unknown
  ): Promise<Doc<SafeUser>> {
    const data = updateUserSchema.parse(input);
    const user = await UserDAO.findById(userId);
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    const self = sameId(admin.id, user._id);

    if (data.role && data.role !== user.role) {
      if (self)
        throw new IllegalOperationError(ERRORS.USER.CANNOT_CHANGE_OWN_ROLE);
      await UserDAO.updateById(user._id, { role: data.role });
      await UserDAO.bumpSessionVersion(user._id);
      await AuditService.record(admin, "user.role_changed", "user", user._id, {
        before: { role: user.role },
        after: { role: data.role },
      });
    }

    if (data.status && data.status !== user.status) {
      if (self)
        throw new IllegalOperationError(ERRORS.USER.CANNOT_DEACTIVATE_SELF);
      const deactivating = data.status === "inactive";
      await UserDAO.updateById(user._id, {
        status: data.status,
        deactivatedAt: deactivating ? new Date() : null,
      });
      if (deactivating) {
        // Login, pending invites, and reset links are blocked immediately; future rosters are released; history stays.
        await UserDAO.bumpSessionVersion(user._id);
        await ActionTokenDAO.revoke(user.email, "organizer_invite");
        await ActionTokenDAO.revoke(user.email, "reset_password");
        await SignupService.releaseFutureForUser(
          user._id,
          "Account deactivated"
        );
      }
      await AuditService.record(
        admin,
        deactivating ? "user.deactivated" : "user.reactivated",
        "user",
        user._id
      );
    }

    if (data.clearReviewFlag) {
      await UserDAO.updateById(user._id, { flaggedForReviewAt: null });
    }
    return (await UserDAO.findById(user._id)) as Doc<SafeUser>;
  }

  static async forceSignout(admin: Actor, userId: string): Promise<void> {
    const user = await UserDAO.findById(userId);
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    await UserDAO.bumpSessionVersion(user._id);
    await AuditService.record(admin, "user.force_signout", "user", user._id);
  }

  /** Organizers are never self-serve: the role is fixed by the invitation. */
  static async invite(admin: Actor, input: unknown): Promise<void> {
    const data = inviteSchema.parse(input);
    const existing = await UserDAO.findByEmail(data.email);
    if (existing && existing.status !== "active")
      throw new ConflictError(ERRORS.USER.DEACTIVATED);
    if (existing && existing.role === data.role)
      throw new ConflictError(ERRORS.AUTH.EMAIL_TAKEN);

    const { secret, id } = await ActionTokenDAO.issue({
      purpose: "organizer_invite",
      email: data.email,
      role: data.role,
      invitedBy: new Types.ObjectId(admin.id),
      userId: existing?._id ?? null,
      ttlMs: ORGANIZER_INVITE_DAYS * 24 * 3_600_000,
    });
    const org = await NotificationService.org();
    await NotificationService.sendRaw(
      data.email,
      NotificationService.templates.organizerInvite(org, {
        inviterName: admin.name,
        role: data.role,
        url: appUrl(`/invite/${secret}`),
      })
    );
    await AuditService.record(admin, "organizer.invited", "invitation", id, {
      after: { email: data.email, role: data.role },
    });
  }

  static async pendingInvites() {
    const invites = await ActionTokenDAO.findPendingInvites();
    return invites.map((i) => ({
      _id: i._id,
      email: i.email,
      role: i.role,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    }));
  }

  static async withActors(entries: Doc<AuditLog>[]): Promise<AuditRow[]> {
    if (!entries.length) return [];
    const actors = await UserDAO.findSummaries([
      ...new Set(entries.map((e) => e.actorId.toString())),
    ]);
    return entries.map((entry) => {
      const actor = actors.find((a) => sameId(a._id, entry.actorId));
      return {
        ...entry,
        actorName:
          RESERVED_ACTOR_NAMES[entry.actorId.toString()] ??
          (actor ? `${actor.firstName} ${actor.lastName}` : "Former member"),
      };
    });
  }

  static async audit(
    input: Record<string, string | undefined>,
    options: { all?: boolean } = {}
  ): Promise<Paginated<AuditRow>> {
    const filters = auditFiltersSchema.parse(input);
    const filter: Record<string, unknown> = {};
    if (filters.action) filter.action = filters.action;
    if (filters.entityType) filter.entityType = filters.entityType;
    if (filters.actorId) filter.actorId = new Types.ObjectId(filters.actorId);
    if (filters.entityId)
      filter.entityId = new Types.ObjectId(filters.entityId);
    if (filters.from || filters.to) {
      filter.createdAt = {
        ...(filters.from ? { $gte: filters.from } : {}),
        ...(filters.to ? { $lte: filters.to } : {}),
      };
    }
    if (options.all) {
      const items = await AuditLogDAO.findAll(filter);
      return {
        items: await AdminService.withActors(items),
        total: items.length,
        page: 1,
        pageSize: items.length,
      };
    }
    const { items, total } = await AuditLogDAO.list(filter, filters.page);
    return {
      items: await AdminService.withActors(items),
      total,
      page: filters.page,
      pageSize: PAGE_SIZE,
    };
  }

  /** Staff who can be assigned events. */
  static async organizers() {
    const [organizers, admins] = await Promise.all([
      UserDAO.listByRole("organizer"),
      UserDAO.listByRole("admin"),
    ]);
    return [...organizers, ...admins].map((u) => ({
      _id: u._id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role,
    }));
  }
}
