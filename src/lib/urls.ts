import type { Role } from "@/types/user";

/** Absolute URLs for emails, PDFs, and calendar files. */
export const appUrl = (path = "") =>
  `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}${path}`;

/** Where a signed-in user lands: admins on the console, everyone else on My shifts. */
export const homePath = (role: Role) =>
  role === "admin" ? "/admin" : "/dashboard";
