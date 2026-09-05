import { z } from "zod";
import { MAX_SHIFT_HOURS } from "@/constants/limits";
import { ATTENDANCE_STATUSES } from "@/types/signup";
import { objectIdSchema, optionalText } from "@/utils/validation/common";

export const createSignupSchema = z.object({
  shiftId: objectIdSchema,
  acknowledgeOverlap: z.boolean().default(false),
});

export const cancelSignupSchema = z.object({ reason: optionalText(300) });

export const attendanceInputSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES),
  hours: z.number().min(0).max(MAX_SHIFT_HOURS).optional(),
  adjustmentReason: optionalText(300),
});
export type AttendanceInput = z.infer<typeof attendanceInputSchema>;
