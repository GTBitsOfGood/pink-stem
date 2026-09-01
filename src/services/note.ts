import NoteStore, { StoredNote } from "@/lib/noteStore";
import { InvalidArgumentsError, NotFoundError } from "@/types/exceptions";
import ERRORS from "@/utils/errorMessages";
import {
  validateNoteBody,
  validateNoteId,
  validateNoteTitle,
} from "@/utils/note";

/**
 * Business logic for notes. Validates its own arguments, enforces existence
 * rules, and delegates all persistence to `NoteStore`. Route handlers call into
 * here and do nothing else.
 */
export default class NoteService {
  static async getAllNotes(): Promise<StoredNote[]> {
    return await NoteStore.getAllNotes();
  }

  static async createNote(title: unknown, body: unknown): Promise<StoredNote> {
    validateNoteTitle(title);
    const noteBody = body ?? "";
    validateNoteBody(noteBody);

    return await NoteStore.createNote(title.trim(), noteBody);
  }

  static async getNote(noteId: string): Promise<StoredNote> {
    validateNoteId(noteId);

    const note = await NoteStore.getNoteById(noteId);
    if (!note) {
      throw new NotFoundError(ERRORS.NOTE.NOT_FOUND);
    }

    return note;
  }

  static async updateNote(
    noteId: string,
    title: unknown,
    body: unknown
  ): Promise<StoredNote> {
    validateNoteId(noteId);

    const updates: { title?: string; body?: string } = {};
    if (title !== undefined) {
      validateNoteTitle(title);
      updates.title = title.trim();
    }
    if (body !== undefined) {
      validateNoteBody(body);
      updates.body = body;
    }

    // A PATCH that names no known field is a caller mistake, not a no-op write.
    if (Object.keys(updates).length === 0) {
      throw new InvalidArgumentsError(ERRORS.NOTE.INVALID_ARGUMENTS.UPDATE);
    }

    // updateNoteById returns null when the id matches nothing, so this is both
    // the write and the existence check.
    const note = await NoteStore.updateNoteById(noteId, updates);
    if (!note) {
      throw new NotFoundError(ERRORS.NOTE.NOT_FOUND);
    }

    return note;
  }

  static async deleteNote(noteId: string): Promise<void> {
    validateNoteId(noteId);

    const deleted = await NoteStore.deleteNoteById(noteId);
    if (!deleted) {
      throw new NotFoundError(ERRORS.NOTE.NOT_FOUND);
    }
  }
}
