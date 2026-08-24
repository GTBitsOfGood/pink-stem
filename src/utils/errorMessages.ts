const ERRORS = Object.freeze({
  NOTE: {
    INVALID_ARGUMENTS: {
      ID: "Note ID is required and must be a valid ObjectID.",
      TITLE: "Title is required and must be a non-empty string.",
      BODY: "Body must be a string.",
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
