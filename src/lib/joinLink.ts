import { isCleared } from "@/lib/clearance";
import type { Event } from "@/types/event";
import type { SignupStatus } from "@/types/signup";
import type { Clearance } from "@/types/user";

/**
 * A virtual event's join link is the way in, and clearance exists because
 * volunteers will be with students. So the link goes only to confirmed
 * volunteers on the event, its organizer and admins, never to someone still
 * pending or waitlisted.
 */
export function canSeeJoinLink(status: SignupStatus): boolean {
  return status === "confirmed";
}

/**
 * `canSeeJoinLink` plus a current clearance when the event requires one,
 * since a clearance can lapse before the hourly job moves the sign-up off
 * confirmed.
 */
export function canJoin(
  status: SignupStatus,
  event: Pick<Event, "requiresClearance">,
  clearance: Pick<Clearance, "status" | "expiresOn"> | null | undefined,
  at: Date = new Date()
): boolean {
  return (
    canSeeJoinLink(status) &&
    (!event.requiresClearance || isCleared(clearance, at))
  );
}

/** The event as anyone not cleared to join it sees it. */
export function withoutJoinLink<T extends Pick<Event, "virtualLink">>(
  event: T
): T {
  return event.virtualLink ? { ...event, virtualLink: undefined } : event;
}
