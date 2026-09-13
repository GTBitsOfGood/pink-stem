import type { Clearance } from "@/types/user";

/** A clearance counts only while it is marked cleared and not yet expired. */
export const isCleared = (
  clearance: Pick<Clearance, "status" | "expiresOn"> | null | undefined,
  at: Date = new Date()
): boolean =>
  !!clearance &&
  clearance.status === "cleared" &&
  !!clearance.expiresOn &&
  clearance.expiresOn > at;
