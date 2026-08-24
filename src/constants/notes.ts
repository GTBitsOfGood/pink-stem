export const MAX_NOTE_TITLE_LENGTH = 200;
export const MAX_NOTE_BODY_LENGTH = 10_000;

export const NOTE_EMPTY_STATE_MESSAGE =
  "No notes yet. Add your first one above.";

/** React Query cache keys for note data. */
export const NOTE_QUERY_KEYS = {
  all: ["notes"] as const,
  detail: (noteId: string) => ["notes", noteId] as const,
};
