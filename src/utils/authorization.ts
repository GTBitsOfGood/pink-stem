import type { Types } from "mongoose";
import type { Actor } from "@/types/auth";
import { ForbiddenError } from "@/types/exceptions";
import ERRORS from "@/utils/errorMessages";

type Id = string | Types.ObjectId;

export const sameId = (a?: Id | null, b?: Id | null) =>
  a != null && b != null && a.toString() === b.toString();

const isStaff = (actor: Actor) => actor.role !== "volunteer";

export const isAdmin = (actor: Actor) => actor.role === "admin";

/** Organizers act only on events they own; admins act on everything. */
export function canManageEvent(
  actor: Actor,
  event: { organizerId: Types.ObjectId }
): boolean {
  return (
    isAdmin(actor) || (isStaff(actor) && sameId(actor.id, event.organizerId))
  );
}

export function assertCanManageEvent(
  actor: Actor,
  event: { organizerId: Types.ObjectId }
): void {
  if (!canManageEvent(actor, event)) {
    throw new ForbiddenError(ERRORS.EVENT.NOT_ORGANIZER);
  }
}
