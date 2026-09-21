import { Types } from "mongoose";
import AuditLogDAO from "@/db/actions/auditLog";
import {
  SCHEDULED_JOB_ACTOR_ID,
  type AuditAction,
  type AuditEntityType,
} from "@/types/audit";
import type { Actor } from "@/types/auth";

interface AuditChange {
  before?: unknown;
  after?: unknown;
}

/**
 * Writes the append-only audit trail. Every consequential action in the
 * product goes through here so admins can explain any number on any
 * certificate months later.
 */
export default class AuditService {
  private static async write(
    actorId: Types.ObjectId,
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string | Types.ObjectId,
    change: AuditChange,
    ipAddress?: string
  ): Promise<void> {
    await AuditLogDAO.create({
      actorId,
      action,
      entityType,
      entityId: new Types.ObjectId(entityId),
      before: change.before,
      after: change.after,
      ipAddress,
    });
  }

  static async record(
    actor: Actor,
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string | Types.ObjectId,
    change: AuditChange = {}
  ): Promise<void> {
    await AuditService.write(
      new Types.ObjectId(actor.id),
      action,
      entityType,
      entityId,
      change,
      actor.ip
    );
  }

  /** Records an automated action without inventing a real user account. */
  static async recordSystem(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string | Types.ObjectId,
    change: AuditChange = {}
  ): Promise<void> {
    await AuditService.write(
      new Types.ObjectId(SCHEDULED_JOB_ACTOR_ID),
      action,
      entityType,
      entityId,
      change
    );
  }
}
