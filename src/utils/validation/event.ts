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
} from "@/types/event";
import { REGIONS, SKILLS } from "@/types/user";
import { generateWeeklySessionDates, WEEKDAYS } from "@/lib/dates";
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
  commitment: z.enum(EVENT_COMMITMENTS).default("short_term"),
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

export const longTermScheduleInputSchema = z
  .object({
    weekdays: z
      .array(z.enum(WEEKDAYS))
      .min(1, "Select at least one weekday")
      .refine((days) => new Set(days).size === days.length, {
        message: "Weekdays must be unique",
      }),
    startTime: timeInputSchema,
    endTime: timeInputSchema,
    firstDate: dateInputSchema,
    lastDate: dateInputSchema,
  })
  .superRefine((schedule, context) => {
    if (schedule.lastDate < schedule.firstDate) {
      context.addIssue({
        code: "custom",
        path: ["lastDate"],
        message: "Last date must be on or after first date",
      });
    }
    if (schedule.endTime <= schedule.startTime) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be after start time",
      });
    }
    if (
      schedule.lastDate >= schedule.firstDate &&
      !generateWeeklySessionDates(
        schedule.firstDate,
        schedule.lastDate,
        schedule.weekdays,
        schedule.startTime,
        schedule.endTime
      ).length
    ) {
      context.addIssue({
        code: "custom",
        path: ["weekdays"],
        message: "Select a weekday within the program date range",
      });
    }
  });
export type LongTermScheduleInput = z.infer<typeof longTermScheduleInputSchema>;

const longTermShiftInputSchema = shiftInputSchema.omit({
  startsAt: true,
  endsAt: true,
});

const longTermEventDetailsSchema = eventInputSchema.omit({
  commitment: true,
  eventDate: true,
  requiresClearance: true,
  minAge: true,
});

export const longTermEventInputSchema = longTermEventDetailsSchema.extend({
  commitment: z.literal("long_term"),
  schedule: longTermScheduleInputSchema,
  shift: longTermShiftInputSchema,
});
export type LongTermEventInput = z.infer<typeof longTermEventInputSchema>;

export const seriesUpdateInputSchema = longTermEventDetailsSchema.extend({
  schedule: z
    .object({
      startTime: timeInputSchema,
      endTime: timeInputSchema,
      lastDate: dateInputSchema,
    })
    .refine((schedule) => schedule.endTime > schedule.startTime, {
      path: ["endTime"],
      message: "End time must be after start time",
    }),
  shift: longTermShiftInputSchema,
});
export type SeriesUpdateInput = z.infer<typeof seriesUpdateInputSchema>;

/** Only admins pick the organizer; for everyone else it is ignored. */
export const createEventSchema = z.union([
  eventInputSchema.extend({
    commitment: z.literal("short_term").default("short_term"),
    organizerId: objectIdSchema.optional(),
  }),
  longTermEventInputSchema.extend({
    organizerId: objectIdSchema.optional(),
  }),
]);

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
