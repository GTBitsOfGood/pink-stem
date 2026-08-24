/**
 * Client-facing shape of a note. Dates are serialized to ISO strings by the
 * time they cross the API boundary, which is why this differs from the
 * Mongoose-facing `Note` in `@/db/models/note`.
 */
export interface Note {
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}
