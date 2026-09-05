/** Absolute URLs for emails, PDFs, and calendar files. */
export const appUrl = (path = "") =>
  `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}${path}`;
