import { MAX_NOTE_BODY_LENGTH, MAX_NOTE_TITLE_LENGTH } from "@/constants/notes";

const ERRORS = Object.freeze({
  NOTE: {
    INVALID_ARGUMENTS: {
      ID: "Note ID is required and must be a valid id.",
      TITLE: `Title is required and must be between 1 and ${MAX_NOTE_TITLE_LENGTH} characters.`,
      BODY: `Body must be a string of at most ${MAX_NOTE_BODY_LENGTH} characters.`,
      UPDATE: "At least one of title or body must be provided.",
    },
    NOT_FOUND: "Note does not exist.",
    FAILURE: {
      CREATE: "Failed to create note.",
      UPDATE: "Failed to update note.",
      DELETE: "Failed to delete note.",
    },
  },
});

export default ERRORS;
