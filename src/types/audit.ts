import type { Types } from "mongoose";

/** Reserved ObjectId used when scheduled work, rather than a user, acts. */
export const SCHEDULED_JOB_ACTOR_ID = "000000000000000000000001";

/** Reserved ObjectIds for rows with no user actor or no target entity. */
export const SYSTEM_ACTOR_ID = "000000000000000000000002";
export const NO_ENTITY_ID = "000000000000000000000000";

export const AUDIT_ACTIONS = [
  "user.role_changed",
  "user.deactivated",
  "user.reactivated",
  "user.force_signout",
  "user.flagged_for_review",
  "clearance.recorded",
  "hours.approved",
  "hours.adjusted",
  "certificate.issued",
  "certificate.revoked",
  "event.cancelled",
  "event.reassigned",
  "message.reported",
  "message.report_reviewed",
  "thread.admin_access",
  "organizer.invited",
  "signup.cancelled_by_staff",
  "shift.counters_reconciled",
  "auth.rate_limited",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
  "user",
  "clearance",
  "event",
  "signup",
  "ledger",
  "certificate",
  "thread",
  "message",
  "invitation",
  "shift",
  "security_event",
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export interface AuditLog {
  actorId: Types.ObjectId;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: Types.ObjectId;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  createdAt: Date;
}
