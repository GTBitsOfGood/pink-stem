import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import { HoursLedgerEntry } from "@/types/signup";

/**
 * Append-only. The DAO exposes no update or delete; a correction is a new
 * row with a negative or positive delta that points at the row it reverses.
 */
const hoursLedgerSchema = new Schema<HoursLedgerEntry>(
  {
    volunteerId: { type: Schema.ObjectId, ref: "User", required: true },
    eventId: { type: Schema.ObjectId, ref: "Event", required: true },
    signupId: { type: Schema.ObjectId, ref: "Signup", default: null },
    hours: { type: Number, required: true },
    approvedBy: { type: Schema.ObjectId, ref: "User", required: true },
    approvedAt: { type: Date, required: true },
    reason: String,
    reversalOf: { type: Schema.ObjectId, ref: "HoursLedger", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

hoursLedgerSchema.index({ volunteerId: 1, approvedAt: -1 });
hoursLedgerSchema.index({ eventId: 1 });

export default defineModel<HoursLedgerEntry>("HoursLedger", hoursLedgerSchema);
