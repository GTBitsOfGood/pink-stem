"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { compactFilters } from "@/http/fetchHTTPClient";
import EventHTTPClient, {
  EventBody,
  EventListFilters,
  ShiftBody,
} from "@/http/eventHTTPClient";
import type { EventUpdateInput } from "@/utils/validation/event";
import type { AttendanceInput } from "@/utils/validation/signup";

export function useEventList(filters: EventListFilters) {
  const clean = compactFilters(filters);
  return useQuery({
    queryKey: QUERY_KEYS.events(clean),
    queryFn: () => EventHTTPClient.list(clean),
    placeholderData: (previous) => previous,
  });
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.event(eventId),
    queryFn: () => EventHTTPClient.get(eventId),
    enabled: !!eventId,
  });
}

export function useOrganizerEvents() {
  return useQuery({
    queryKey: QUERY_KEYS.organizerEvents,
    queryFn: () => EventHTTPClient.mine(),
  });
}

/** Every organizer action on one event. Each invalidates the event and the organizer's list. */
export function useEventActions(eventId?: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizerEvents });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    if (eventId)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.eventRoster(eventId),
      });
  };
  const id = () => eventId as string;

  return {
    create: useMutation({
      mutationFn: (body: EventBody) => EventHTTPClient.create(body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: (body: EventBody) => EventHTTPClient.update(id(), body),
      onSuccess: invalidate,
    }),
    publish: useMutation({
      mutationFn: () => EventHTTPClient.publish(id()),
      onSuccess: invalidate,
    }),
    cancel: useMutation({
      mutationFn: (reason: string) => EventHTTPClient.cancel(id(), reason),
      onSuccess: invalidate,
    }),
    duplicate: useMutation({
      mutationFn: () => EventHTTPClient.duplicate(id()),
      onSuccess: invalidate,
    }),
    reassign: useMutation({
      mutationFn: (organizerId: string) =>
        EventHTTPClient.reassign(id(), organizerId),
      onSuccess: invalidate,
    }),
    addShift: useMutation({
      mutationFn: (body: ShiftBody) => EventHTTPClient.addShift(id(), body),
      onSuccess: invalidate,
    }),
    updateShift: useMutation({
      mutationFn: ({ shiftId, body }: { shiftId: string; body: ShiftBody }) =>
        EventHTTPClient.updateShift(shiftId, body),
      onSuccess: invalidate,
    }),
    deleteShift: useMutation({
      mutationFn: (shiftId: string) => EventHTTPClient.deleteShift(shiftId),
      onSuccess: invalidate,
    }),
    postUpdate: useMutation({
      mutationFn: (body: EventUpdateInput) =>
        EventHTTPClient.postUpdate(id(), body),
      onSuccess: invalidate,
    }),
    editUpdate: useMutation({
      mutationFn: ({ updateId, body }: { updateId: string; body: string }) =>
        EventHTTPClient.editUpdate(updateId, body),
      onSuccess: invalidate,
    }),
    deleteUpdate: useMutation({
      mutationFn: (updateId: string) => EventHTTPClient.deleteUpdate(updateId),
      onSuccess: invalidate,
    }),
    broadcast: useMutation({
      mutationFn: ({ body, shiftId }: { body: string; shiftId?: string }) =>
        EventHTTPClient.broadcast(id(), body, shiftId),
    }),
    approveRoster: useMutation({
      mutationFn: () => EventHTTPClient.approveRoster(id()),
      onSuccess: invalidate,
    }),
  };
}

export function useRoster(eventId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.eventRoster(eventId),
    queryFn: () => EventHTTPClient.roster(eventId),
    enabled: !!eventId,
  });
}

export function useMarkAttendance(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      signupId,
      body,
    }: {
      signupId: string;
      body: AttendanceInput;
    }) => EventHTTPClient.markAttendance(signupId, body),
    // Marks are saved one at a time and retried, so a weak gym signal never loses a toggle.
    retry: 5,
    retryDelay: (attempt) => Math.min(30_000, 1_000 * 2 ** attempt),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.eventRoster(eventId),
      }),
  });
}
