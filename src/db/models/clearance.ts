import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import { Clearance, CLEARANCE_STATUSES } from "@/types/user";

/**
 * The screening record. Kept in its own collection so it is never returned by
 * accident alongside a user: organizers only ever receive a boolean derived
 * from it.
 */
const clearanceSchema = new Schema<Clearance>(
  {
    userId: {
      type: Schema.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    status: { type: String, enum: CLEARANCE_STATUSES, default: "none" },
    clearedOn: { type: Date, default: null },
    expiresOn: { type: Date, default: null },
    recordedBy: { type: Schema.ObjectId, ref: "User", default: null },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export default defineModel<Clearance>("Clearance", clearanceSchema);
