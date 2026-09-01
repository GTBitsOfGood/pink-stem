import { z } from "zod";
import { MAX_NOTE_BODY_LENGTH, MAX_NOTE_TITLE_LENGTH } from "@/constants/notes";

export const noteIdSchema = z.string().uuid();

export const noteTitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_NOTE_TITLE_LENGTH);

export const noteBodySchema = z.string().max(MAX_NOTE_BODY_LENGTH);

export function noteIdIsValid(id: string): boolean {
  return noteIdSchema.safeParse(id).success;
}
