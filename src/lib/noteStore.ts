import { randomUUID } from "crypto";
import { WithId } from "@/types/models";
import { Note } from "@/types/note";

export type StoredNote = WithId<Note>;

declare global {
  var noteStore: Map<string, StoredNote> | undefined;
}

/**
 * In-memory stand-in for a database, used until we pick one.
 *
 * Next.js hot-reloads modules in development, so the map is cached on `global`
 * to keep notes alive across reloads. Everything below is async on purpose:
 * when a real database lands, this file is replaced by a DAO with the same
 * method signatures and nothing above it has to change.
 *
 * Notes do not survive a server restart. That is expected for now.
 */
const notes = globalThis.noteStore ?? new Map<string, StoredNote>();
globalThis.noteStore = notes;

export default class NoteStore {
  static async createNote(title: string, body: string): Promise<StoredNote> {
    const now = new Date().toISOString();
    const note: StoredNote = {
      _id: randomUUID(),
      title,
      body,
      createdAt: now,
      updatedAt: now,
    };

    notes.set(note._id, note);
    return note;
  }

  static async getAllNotes(): Promise<StoredNote[]> {
    return [...notes.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  static async getNoteById(noteId: string): Promise<StoredNote | null> {
    return notes.get(noteId) ?? null;
  }

  static async updateNoteById(
    noteId: string,
    updates: Partial<Pick<Note, "title" | "body">>
  ): Promise<StoredNote | null> {
    const existing = notes.get(noteId);
    if (!existing) {
      return null;
    }

    const updated: StoredNote = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    notes.set(noteId, updated);
    return updated;
  }

  /** Returns the deleted note, or null when no note had that id. */
  static async deleteNoteById(noteId: string): Promise<StoredNote | null> {
    const existing = notes.get(noteId);
    if (!existing) {
      return null;
    }

    notes.delete(noteId);
    return existing;
  }
}
