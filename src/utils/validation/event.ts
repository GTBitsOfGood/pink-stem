import { z } from "zod";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_UPDATE_LENGTH,
} from "@/constants/limits";
import {
  EVENT_COMMITMENTS,
  EVENT_STATUSES,
  EVENT_VISIBILITIES,
  PROGRAM_AREAS,
  UPDATE_KINDS,
  WEEKDAYS,
} from "@/types/event";
import { REGIONS, SKILLS } from "@/types/user";
import {
  dateInputSchema,
  dateRangeSchema,
  dateSchema,
  objectIdSchema,
  optionalText,
  pageSchema,
  phoneSchema,
  queryBoolean,
  text,
} from "@/utils/validation/common";

export const eventInputSchema = z.object({
  title: text(MAX_TITLE_LENGTH),
  description: text(MAX_DESCRIPTION_LENGTH),
  programArea: z.enum(PROGRAM_AREAS),
  visibility: z.enum(EVENT_VISIBILITIES).default("public"),
  eventDate: dateSchema,
  region: z.enum(REGIONS),
  isVirtual: z.boolean().default(false),
  virtualLink: z.url().optional().or(z.literal("")),
  locationName: optionalText(120),
  address: optionalText(200),
  locationNote: optionalText(200),
  city: optionalText(80),
  requiresClearance: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  minAge: z.number().int().min(0).max(99).optional().nullable(),
  siteContactName: optionalText(100),
  siteContactPhone: phoneSchema.optional().or(z.literal("")),
  coverImageUrl: z.url().optional().or(z.literal("")),
});
export type EventInput = z.infer<typeof eventInputSchema>;

/** Only admins pick the organizer; for everyone else it is ignored. */
export const createEventSchema = eventInputSchema.extend({
  organizerId: objectIdSchema.optional(),
});

/** Which create schema applies. A body that names none is a short-term event. */
export const commitmentSchema = z.object({
  commitment: z.enum(EVENT_COMMITMENTS).default("short_term"),
});

export const shiftInputSchema = z.object({
  roleName: text(80),
  description: optionalText(500),
  startsAt: dateSchema,
  endsAt: dateSchema,
  capacity: z.number().int().min(1).max(500),
  minStaffing: z.number().int().min(0).max(500).default(1),
  requiredSkills: z.array(z.enum(SKILLS)).default([]),
});
export type ShiftInput = z.infer<typeof shiftInputSchema>;

const timeInputSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must be a time (HH:mm)");

/** What every session of a program shares. Long-term rules fix clearance and age. */
const longTermDetailsSchema = eventInputSchema.omit({
  eventDate: true,
  requiresClearance: true,
  minAge: true,
});

/** The one shift each session gets; its times come from the schedule. */
const longTermShiftInputSchema = shiftInputSchema.omit({
  startsAt: true,
  endsAt: true,
});

export const longTermEventInputSchema = longTermDetailsSchema.extend({
  commitment: z.literal("long_term"),
  organizerId: objectIdSchema.optional(),
  schedule: z.object({
    weekdays: z
      .array(z.enum(WEEKDAYS))
      .min(1)
      .transform((days) => [...new Set(days)]),
    startTime: timeInputSchema,
    endTime: timeInputSchema,
    firstDate: dateInputSchema,
    lastDate: dateInputSchema,
  }),
  shift: longTermShiftInputSchema,
});
export type LongTermEventInput = z.infer<typeof longTermEventInputSchema>;

/** A program keeps its first date and weekdays; its last date can move. */
export const seriesUpdateInputSchema = longTermDetailsSchema.extend({
  schedule: z.object({
    startTime: timeInputSchema,
    endTime: timeInputSchema,
    lastDate: dateInputSchema,
  }),
  shift: longTermShiftInputSchema,
});
export type SeriesUpdateInput = z.infer<typeof seriesUpdateInputSchema>;

export const cancelEventSchema = z.object({ reason: text(500) });

export const reassignEventSchema = z.object({ organizerId: objectIdSchema });

export const eventFiltersSchema = dateRangeSchema.extend({
  programArea: z.enum(PROGRAM_AREAS).optional(),
  where: z.enum([...REGIONS, "virtual"]).optional(),
  hasSpots: queryBoolean.optional(),
  q: z.string().trim().max(100).optional(),
  page: pageSchema,
});

export const adminEventFiltersSchema = eventFiltersSchema.extend({
  status: z.enum(EVENT_STATUSES).optional(),
  organizerId: objectIdSchema.optional(),
});

export const eventUpdateInputSchema = z.object({
  kind: z.enum(UPDATE_KINDS),
  body: text(MAX_UPDATE_LENGTH),
  rosterOnly: z.boolean().default(false),
});
export type EventUpdateInput = z.infer<typeof eventUpdateInputSchema>;

export const editUpdateSchema = z.object({ body: text(MAX_UPDATE_LENGTH) });
