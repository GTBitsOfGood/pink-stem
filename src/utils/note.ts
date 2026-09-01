import { InvalidArgumentsError } from "@/types/exceptions";
import ERRORS from "@/utils/errorMessages";
import {
  noteBodySchema,
  noteIdIsValid,
  noteTitleSchema,
} from "@/utils/validation";

/**
 * Argument guards shared by the note service. Each throws a typed exception
 * that `handleError` maps to the correct HTTP status.
 */
export function validateNoteId(noteId: string): void {
  if (!noteId || !noteIdIsValid(noteId)) {
    throw new InvalidArgumentsError(ERRORS.NOTE.INVALID_ARGUMENTS.ID);
  }
}

export function validateNoteTitle(title: unknown): asserts title is string {
  if (!noteTitleSchema.safeParse(title).success) {
    throw new InvalidArgumentsError(ERRORS.NOTE.INVALID_ARGUMENTS.TITLE);
  }
}

export function validateNoteBody(body: unknown): asserts body is string {
  if (!noteBodySchema.safeParse(body).success) {
    throw new InvalidArgumentsError(ERRORS.NOTE.INVALID_ARGUMENTS.BODY);
  }
}
