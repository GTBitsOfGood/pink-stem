import { Types } from "mongoose";
import { z } from "zod";
import { MAX_NOTE_BODY_LENGTH, MAX_NOTE_TITLE_LENGTH } from "@/constants/notes";

export const objectIdSchema = z
  .string()
  .refine((value) => Types.ObjectId.isValid(value));

export const noteTitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_NOTE_TITLE_LENGTH);

export const noteBodySchema = z.string().max(MAX_NOTE_BODY_LENGTH);

export function objectIdIsValid(id: string): boolean {
  return objectIdSchema.safeParse(id).success;
}
