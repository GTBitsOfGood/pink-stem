import fetchHTTPClient, { toQuery } from "@/http/fetchHTTPClient";
import type {
  EventDetail,
  EventWithShifts,
  Paginated,
  Roster,
  UpdateWithAuthor,
} from "@/types/api";
import type { Shift } from "@/types/event";
import type { Doc, Serialized } from "@/types/models";
import type { Signup } from "@/types/signup";
import type {
  EventInput,
  EventUpdateInput,
  ShiftInput,
} from "@/utils/validation/event";
import type { AttendanceInput } from "@/utils/validation/signup";

export type ClientEvent = Serialized<EventWithShifts>;
export type ClientEventDetail = Serialized<EventDetail>;
export type ClientShift = Serialized<Doc<Shift>>;
export type ClientSignup = Serialized<Doc<Signup>>;
export type ClientRoster = Serialized<Roster>;
export type ClientUpdate = Serialized<UpdateWithAuthor>;
export type EventBody = Omit<EventInput, "eventDate"> & { eventDate: string };
export type ShiftBody = Omit<ShiftInput, "startsAt" | "endsAt"> & {
  startsAt: string;
  endsAt: string;
};

export type EventListFilters = Record<string, string | undefined>;

export default class EventHTTPClient {
  static list(filters: EventListFilters): Promise<Paginated<ClientEvent>> {
    return fetchHTTPClient(`/events${toQuery(filters)}`);
  }

  static get(eventId: string): Promise<ClientEventDetail> {
    return fetchHTTPClient(`/events/${eventId}`);
  }

  static mine(): Promise<ClientEvent[]> {
    return fetchHTTPClient("/organizer/events");
  }

  static create(body: EventBody): Promise<ClientEvent> {
    return fetchHTTPClient("/events", "POST", body);
  }

  static update(eventId: string, body: EventBody): Promise<ClientEvent> {
    return fetchHTTPClient(`/events/${eventId}`, "PATCH", body);
  }

  static publish(eventId: string): Promise<ClientEvent> {
    return fetchHTTPClient(`/events/${eventId}/publish`, "POST");
  }

  static cancel(eventId: string, reason: string): Promise<ClientEvent> {
    return fetchHTTPClient(`/events/${eventId}/cancel`, "POST", { reason });
  }

  static duplicate(eventId: string): Promise<ClientEvent> {
    return fetchHTTPClient(`/events/${eventId}/duplicate`, "POST");
  }

  static reassign(eventId: string, organizerId: string): Promise<ClientEvent> {
    return fetchHTTPClient(`/events/${eventId}/reassign`, "POST", {
      organizerId,
    });
  }

  static addShift(eventId: string, body: ShiftBody): Promise<ClientShift> {
    return fetchHTTPClient(`/events/${eventId}/shifts`, "POST", body);
  }

  static updateShift(shiftId: string, body: ShiftBody): Promise<ClientShift> {
    return fetchHTTPClient(`/shifts/${shiftId}`, "PATCH", body);
  }

  static deleteShift(shiftId: string): Promise<void> {
    return fetchHTTPClient(`/shifts/${shiftId}`, "DELETE");
  }

  static roster(eventId: string): Promise<ClientRoster> {
    return fetchHTTPClient(`/events/${eventId}/roster`);
  }

  static approveRoster(
    eventId: string
  ): Promise<{ approved: number; totalHours: number }> {
    return fetchHTTPClient(`/events/${eventId}/roster`, "POST");
  }

  static markAttendance(
    signupId: string,
    body: AttendanceInput
  ): Promise<ClientSignup> {
    return fetchHTTPClient(`/signups/${signupId}/attendance`, "PATCH", body);
  }

  static postUpdate(
    eventId: string,
    body: EventUpdateInput
  ): Promise<ClientUpdate> {
    return fetchHTTPClient(`/events/${eventId}/updates`, "POST", body);
  }

  static editUpdate(updateId: string, body: string): Promise<ClientUpdate> {
    return fetchHTTPClient(`/updates/${updateId}`, "PATCH", { body });
  }

  static deleteUpdate(updateId: string): Promise<void> {
    return fetchHTTPClient(`/updates/${updateId}`, "DELETE");
  }

  static broadcast(
    eventId: string,
    body: string,
    shiftId?: string
  ): Promise<{ sent: number }> {
    return fetchHTTPClient(`/events/${eventId}/broadcast`, "POST", {
      body,
      shiftId,
    });
  }
}
