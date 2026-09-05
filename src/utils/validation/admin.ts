import { z } from "zod";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/types/audit";
import { CLEARANCE_STATUSES, ROLES, USER_STATUSES } from "@/types/user";
import {
  dateInputSchema,
  dateRangeSchema,
  emailSchema,
  endOfDayInputSchema,
  objectIdSchema,
  optionalText,
  pageSchema,
  text,
} from "@/utils/validation/common";

export const peopleFiltersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  clearance: z.enum(CLEARANCE_STATUSES).optional(),
  flagged: z.coerce.boolean().optional(),
  page: pageSchema,
});

export const updateUserSchema = z
  .object({
    role: z.enum(ROLES),
    status: z.enum(USER_STATUSES),
    clearReviewFlag: z.literal(true),
  })
  .partial();
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const clearanceInputSchema = z.object({
  status: z.enum(CLEARANCE_STATUSES),
  clearedOn: dateInputSchema.optional().nullable(),
  expiresOn: endOfDayInputSchema.optional().nullable(),
  notes: optionalText(1000),
});
export type ClearanceInput = z.infer<typeof clearanceInputSchema>;

export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(["organizer", "admin"]),
});
export type InviteInput = z.infer<typeof inviteSchema>;

export const adjustHoursSchema = z.object({
  volunteerId: objectIdSchema,
  eventId: objectIdSchema,
  hours: z
    .number()
    .refine((h) => h !== 0, "must not be zero")
    .max(24)
    .min(-24),
  reason: text(500),
});
export type AdjustHoursInput = z.infer<typeof adjustHoursSchema>;

export const revokeCertificateSchema = z.object({ reason: text(500) });

export const auditFiltersSchema = dateRangeSchema.extend({
  action: z.enum(AUDIT_ACTIONS).optional(),
  entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),
  actorId: objectIdSchema.optional(),
  entityId: objectIdSchema.optional(),
  page: pageSchema,
});

export const REPORT_KINDS = [
  "hours",
  "volunteers",
  "fill",
  "no_shows",
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const reportFiltersSchema = z.object({
  from: dateInputSchema,
  to: endOfDayInputSchema,
});

export const settingsInputSchema = z
  .object({
    orgName: text(120),
    addressLine1: text(160),
    addressLine2: text(160),
    phone: text(40),
    email: emailSchema,
    website: z.url(),
    signatoryName: text(100),
    signatoryTitle: text(100),
    waiverText: text(20_000),
    codeOfConductText: text(20_000),
    /** Bumping the version makes every volunteer re-accept at next sign-up. */
    bumpWaiverVersion: z.boolean(),
    cancellationCutoffHours: z.number().int().min(0).max(168),
    autoPromoteCutoffHours: z.number().int().min(0).max(168),
    noShowThreshold: z.number().int().min(1).max(20),
    noShowWindowDays: z.number().int().min(7).max(365),
  })
  .partial();
export type SettingsInput = z.infer<typeof settingsInputSchema>;
