"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import SignupHTTPClient from "@/http/signupHTTPClient";
import UserHTTPClient from "@/http/userHTTPClient";

export function useMySignups(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.mySignups,
    queryFn: () => UserHTTPClient.mySignups(),
    enabled,
  });
}

export function useMyHours(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.myHours,
    queryFn: () => UserHTTPClient.myHours(),
    enabled,
  });
}

/** Sign up, cancel, approve, promote. All of them touch the same three caches. */
export function useSignupActions(eventId?: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mySignups });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    if (eventId)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.eventRoster(eventId),
      });
  };

  return {
    signUp: useMutation({
      mutationFn: ({
        shiftId,
        acknowledgeOverlap,
      }: {
        shiftId: string;
        acknowledgeOverlap?: boolean;
      }) => SignupHTTPClient.create(shiftId, acknowledgeOverlap),
      onSuccess: invalidate,
    }),
    cancel: useMutation({
      mutationFn: ({
        signupId,
        reason,
      }: {
        signupId: string;
        reason?: string;
      }) => SignupHTTPClient.cancel(signupId, reason),
      onSuccess: invalidate,
    }),
    approve: useMutation({
      mutationFn: (signupId: string) => SignupHTTPClient.approve(signupId),
      onSuccess: invalidate,
    }),
    promote: useMutation({
      mutationFn: (signupId: string) => SignupHTTPClient.promote(signupId),
      onSuccess: invalidate,
    }),
    requestServiceRecord: useMutation({
      mutationFn: ({
        periodStart,
        periodEnd,
      }: {
        periodStart: string;
        periodEnd: string;
      }) => UserHTTPClient.requestServiceRecord(periodStart, periodEnd),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myHours }),
    }),
  };
}
