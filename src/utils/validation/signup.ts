import { z } from "zod";
import { MAX_ABSENCE_NOTE_LENGTH, MAX_SHIFT_HOURS } from "@/constants/limits";
import { ABSENCE_REASONS, ATTENDANCE_STATUSES } from "@/types/signup";
import { objectIdSchema, optionalText } from "@/utils/validation/common";

export const createSignupSchema = z.object({
  shiftId: objectIdSchema,
  acknowledgeOverlap: z.boolean().default(false),
});

export const cancelSignupSchema = z.object({ reason: optionalText(300) });

export const reportAbsenceSchema = z.object({
  reason: z.enum(ABSENCE_REASONS),
  note: optionalText(MAX_ABSENCE_NOTE_LENGTH),
});
export type ReportAbsenceInput = z.infer<typeof reportAbsenceSchema>;

export const attendanceInputSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES),
  hours: z.number().min(0).max(MAX_SHIFT_HOURS).optional(),
  adjustmentReason: optionalText(300),
});
export type AttendanceInput = z.infer<typeof attendanceInputSchema>;
