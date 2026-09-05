import { z } from "zod";
import { MAX_MESSAGE_LENGTH } from "@/constants/limits";
import {
  objectIdSchema,
  pageSchema,
  queryBoolean,
  text,
} from "@/utils/validation/common";

export const createThreadSchema = z.object({
  eventId: objectIdSchema,
  /** Organizers name the volunteer; volunteers always message the organizer. */
  volunteerId: objectIdSchema.optional(),
  body: text(MAX_MESSAGE_LENGTH),
});

export const sendMessageSchema = z.object({ body: text(MAX_MESSAGE_LENGTH) });

export const broadcastSchema = z.object({
  shiftId: objectIdSchema.optional(),
  body: text(MAX_MESSAGE_LENGTH),
});

export const reportMessageSchema = z.object({
  messageId: objectIdSchema,
  reason: text(500),
});

export const threadFiltersSchema = z.object({
  eventId: objectIdSchema.optional(),
  involvesMinor: queryBoolean.optional(),
  reported: queryBoolean.optional(),
  page: pageSchema,
});
