import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import { ActionToken, TOKEN_PURPOSES } from "@/types/token";
import { ROLES } from "@/types/user";

const actionTokenSchema = new Schema<ActionToken>(
  {
    purpose: { type: String, enum: TOKEN_PURPOSES, required: true },
    tokenHash: { type: String, required: true, unique: true },
    email: { type: String, required: true, lowercase: true },
    userId: { type: Schema.ObjectId, ref: "User", default: null },
    role: { type: String, enum: ROLES },
    invitedBy: { type: Schema.ObjectId, ref: "User", default: null },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// MongoDB removes expired links on its own.
actionTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
actionTokenSchema.index({ email: 1, purpose: 1 });

export default defineModel<ActionToken>("ActionToken", actionTokenSchema);
