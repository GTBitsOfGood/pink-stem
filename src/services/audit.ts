import { Types } from "mongoose";
import AuditLogDAO from "@/db/actions/auditLog";
import type { AuditAction, AuditEntityType } from "@/types/audit";
import type { Actor } from "@/types/auth";

/**
 * Writes the append-only audit trail. Every consequential action in the
 * product goes through here so admins can explain any number on any
 * certificate months later.
 */
export default class AuditService {
  static async record(
    actor: Actor,
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string | Types.ObjectId,
    change: { before?: unknown; after?: unknown } = {}
  ): Promise<void> {
    await AuditLogDAO.create({
      actorId: new Types.ObjectId(actor.id),
      action,
      entityType,
      entityId: new Types.ObjectId(entityId),
      before: change.before,
      after: change.after,
      ipAddress: actor.ip,
    });
  }
}
