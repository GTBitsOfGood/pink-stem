import fetchHTTPClient from "@/http/fetchHTTPClient";
import { WithId } from "@/types/models";
import { Note } from "@/types/note";

export interface CreateNoteBody {
  title: string;
  body: string;
}

export interface UpdateNoteBody {
  title?: string;
  body?: string;
}

/**
 * Typed client for the /api/v1/notes endpoints. Components never call `fetch`
 * directly; they go through here so request shapes stay in one place.
 */
export default class NoteHTTPClient {
  static async getNotes(): Promise<WithId<Note>[]> {
    return fetchHTTPClient<WithId<Note>[]>("/notes", {
      method: "GET",
    });
  }

  static async createNote(title: string, body: string): Promise<WithId<Note>> {
    const createNoteRequestBody: CreateNoteBody = { title, body };
    return fetchHTTPClient<WithId<Note>>("/notes", {
      method: "POST",
      body: JSON.stringify(createNoteRequestBody),
    });
  }

  static async getNote(noteId: string): Promise<WithId<Note>> {
    return fetchHTTPClient<WithId<Note>>(`/notes/${noteId}`, {
      method: "GET",
    });
  }

  static async updateNote(
    noteId: string,
    updates: UpdateNoteBody
  ): Promise<WithId<Note>> {
    return fetchHTTPClient<WithId<Note>>(`/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  static async deleteNote(noteId: string): Promise<void> {
    return fetchHTTPClient<void>(`/notes/${noteId}`, {
      method: "DELETE",
    });
  }
}
