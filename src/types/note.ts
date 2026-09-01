/**
 * Client-facing shape of a note. Dates are ISO strings, which is what the
 * store holds and what crosses the API boundary.
 */
export interface Note {
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}
