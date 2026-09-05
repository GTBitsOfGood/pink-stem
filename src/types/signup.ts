import type { Types } from "mongoose";

export const SIGNUP_STATUSES = [
  "pending",
  "confirmed",
  "waitlisted",
  "cancelled",
  "attended",
  "no_show",
] as const;
export type SignupStatus = (typeof SIGNUP_STATUSES)[number];

/** Statuses that hold a spot on the shift. */
export const ACTIVE_SIGNUP_STATUSES = ["pending", "confirmed"] as const;

/** Statuses that still put the volunteer on the roster in some form. */
export const LIVE_SIGNUP_STATUSES = [
  "pending",
  "confirmed",
  "waitlisted",
] as const;

export const PENDING_REASONS = [
  "waiver",
  "guardian_consent",
  "clearance",
  "approval",
] as const;
export type PendingReason = (typeof PENDING_REASONS)[number];

export const ATTENDANCE_STATUSES = ["attended", "no_show"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface Attendance {
  status: AttendanceStatus;
  hours: number;
  adjustmentReason?: string;
  markedBy: Types.ObjectId;
  markedAt: Date;
}

export interface Signup {
  shiftId: Types.ObjectId;
  eventId: Types.ObjectId;
  volunteerId: Types.ObjectId;
  status: SignupStatus;
  pendingReasons: PendingReason[];
  signedUpAt: Date;
  confirmedAt?: Date | null;
  approvedAt?: Date | null;
  approvedBy?: Types.ObjectId | null;
  cancelledAt?: Date | null;
  cancelledBy?: Types.ObjectId | null;
  cancellationReason?: string;
  /** When a confirmed spot lapsed back to pending, how long it is held. */
  holdUntil?: Date | null;
  attendance?: Attendance | null;
}

export interface HoursLedgerEntry {
  volunteerId: Types.ObjectId;
  eventId: Types.ObjectId;
  signupId?: Types.ObjectId | null;
  hours: number;
  approvedBy: Types.ObjectId;
  approvedAt: Date;
  reason?: string;
  /** Corrections are new rows that point at the row they reverse. */
  reversalOf?: Types.ObjectId | null;
}
