import type { Types } from "mongoose";

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
  "thread.admin_access",
  "organizer.invited",
  "signup.cancelled_by_staff",
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
