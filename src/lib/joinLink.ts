import type { Event } from "@/types/event";
import type { SignupStatus } from "@/types/signup";

/**
 * A virtual event's join link is the way in, and clearance exists because
 * volunteers will be with students. So the link goes only to confirmed
 * volunteers on the event, its organizer and admins, never to someone still
 * pending or waitlisted.
 */
export function canSeeJoinLink(status: SignupStatus): boolean {
  return status === "confirmed";
}

/** The event as anyone not cleared to join it sees it. */
export function withoutJoinLink<T extends Pick<Event, "virtualLink">>(
  event: T
): T {
  return event.virtualLink ? { ...event, virtualLink: undefined } : event;
}
