import NoteDAO from "@/db/actions/note";
import { NoteDocument } from "@/db/models/note";
import { NotFoundError } from "@/types/exceptions";
import ERRORS from "@/utils/errorMessages";
import {
  validateNoteBody,
  validateNoteId,
  validateNoteTitle,
} from "@/utils/note";

/**
 * Business logic for notes. Validates its own arguments, enforces existence
 * rules, and delegates all persistence to `NoteDAO`. Route handlers call into
 * here and do nothing else.
 */
export default class NoteService {
  static async getAllNotes(): Promise<NoteDocument[]> {
    return await NoteDAO.getAllNotes();
  }

  static async createNote(
    title: unknown,
    body: unknown
  ): Promise<NoteDocument> {
    validateNoteTitle(title);
    const noteBody = body ?? "";
    validateNoteBody(noteBody);

    return await NoteDAO.createNote(title.trim(), noteBody);
  }

  static async getNote(noteId: string): Promise<NoteDocument> {
    validateNoteId(noteId);

    const note = await NoteDAO.getNoteById(noteId);
    if (!note) {
      throw new NotFoundError(ERRORS.NOTE.NOT_FOUND);
    }

    return note;
  }

  static async updateNote(
    noteId: string,
    title: unknown,
    body: unknown
  ): Promise<NoteDocument> {
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

    // Confirms the note exists before attempting the write, so a missing note
    // is a 404 rather than a silent no-op.
    await NoteService.getNote(noteId);

    const note = await NoteDAO.updateNoteById(noteId, updates);
    if (!note) {
      throw new NotFoundError(ERRORS.NOTE.NOT_FOUND);
    }

    return note;
  }

  static async deleteNote(noteId: string): Promise<void> {
    validateNoteId(noteId);
    await NoteService.getNote(noteId);
    await NoteDAO.deleteNoteById(noteId);
  }
}
