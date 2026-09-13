import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import {
  ATTENDANCE_STATUSES,
  PENDING_REASONS,
  Signup,
  SIGNUP_STATUSES,
} from "@/types/signup";

const attendanceSchema = new Schema(
  {
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    hours: { type: Number, required: true, min: 0 },
    adjustmentReason: String,
    markedBy: { type: Schema.ObjectId, ref: "User", required: true },
    markedAt: { type: Date, required: true },
  },
  { _id: false }
);

const signupSchema = new Schema<Signup>(
  {
    shiftId: { type: Schema.ObjectId, ref: "Shift", required: true },
    eventId: { type: Schema.ObjectId, ref: "Event", required: true },
    volunteerId: { type: Schema.ObjectId, ref: "User", required: true },
    status: { type: String, enum: SIGNUP_STATUSES, required: true },
    pendingReasons: { type: [String], enum: PENDING_REASONS, default: [] },
    signedUpAt: { type: Date, required: true },
    confirmedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.ObjectId, ref: "User", default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: Schema.ObjectId, ref: "User", default: null },
    cancellationReason: String,
    holdUntil: { type: Date, default: null },
    // Embedded, so "one attendance record per sign-up" holds by construction.
    attendance: { type: attendanceSchema, default: null },
  },
  { timestamps: true }
);

// One sign-up per volunteer per shift, ever. Re-signing after a cancellation
// reactivates the same document, which keeps ledger references stable.
signupSchema.index({ shiftId: 1, volunteerId: 1 }, { unique: true });
signupSchema.index({ volunteerId: 1, status: 1 });
signupSchema.index({ eventId: 1, status: 1 });

export default defineModel<Signup>("Signup", signupSchema);
