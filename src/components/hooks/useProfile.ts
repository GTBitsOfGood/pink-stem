"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import UserHTTPClient, { ProfileBody } from "@/http/userHTTPClient";
import type { Me } from "@/http/authHTTPClient";

/** Profile edits, waiver acceptance, and the public org settings. */
export function useProfile() {
  const queryClient = useQueryClient();
  const setMe = (me: Me) => {
    queryClient.setQueryData(QUERY_KEYS.session, me);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mySignups });
  };

  return {
    update: useMutation({
      mutationFn: (body: ProfileBody) => UserHTTPClient.updateProfile(body),
      onSuccess: setMe,
    }),
    acceptWaiver: useMutation({
      mutationFn: () => UserHTTPClient.acceptWaiver(),
      onSuccess: setMe,
    }),
    resendGuardianConsent: useMutation({
      mutationFn: () => UserHTTPClient.resendGuardianConsent(),
    }),
  };
}

export function usePublicSettings() {
  return useQuery({
    queryKey: QUERY_KEYS.publicSettings,
    queryFn: () => UserHTTPClient.publicSettings(),
    staleTime: 10 * 60_000,
  });
}
