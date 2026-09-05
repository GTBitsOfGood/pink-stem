import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, AuditLog } from "@/types/audit";

/** Append-only. Nothing in the codebase updates or deletes these rows. */
const auditLogSchema = new Schema<AuditLog>(
  {
    actorId: { type: Schema.ObjectId, ref: "User", required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    entityType: { type: String, enum: AUDIT_ENTITY_TYPES, required: true },
    entityId: { type: Schema.ObjectId, required: true },
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    ipAddress: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

export default defineModel<AuditLog>("AuditLog", auditLogSchema);
