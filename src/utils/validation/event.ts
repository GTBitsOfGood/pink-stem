import { z } from "zod";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_UPDATE_LENGTH,
} from "@/constants/limits";
import {
  EVENT_STATUSES,
  EVENT_VISIBILITIES,
  PROGRAM_AREAS,
  UPDATE_KINDS,
} from "@/types/event";
import { REGIONS, SKILLS } from "@/types/user";
import {
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
  requiresClearance: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
  minAge: z.number().int().min(0).max(99).optional().nullable(),
  siteContactName: optionalText(100),
  siteContactPhone: phoneSchema.optional().or(z.literal("")),
  coverImageUrl: z.url().optional().or(z.literal("")),
});
export type EventInput = z.infer<typeof eventInputSchema>;

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

export const cancelEventSchema = z.object({ reason: text(500) });

export const reassignEventSchema = z.object({ organizerId: objectIdSchema });

export const eventFiltersSchema = dateRangeSchema.extend({
  programArea: z.enum(PROGRAM_AREAS).optional(),
  where: z.enum([...REGIONS, "virtual"]).optional(),
  hasSpots: queryBoolean.optional(),
  q: z.string().trim().max(100).optional(),
  page: pageSchema,
});
export type EventFilters = z.infer<typeof eventFiltersSchema>;

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
