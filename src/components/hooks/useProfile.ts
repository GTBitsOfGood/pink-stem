"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import UserHTTPClient, { ProfileBody } from "@/http/userHTTPClient";
import type { Me } from "@/http/authHTTPClient";

/** Shared by every resend button so they agree on loading and the rate limit. */
export const RESEND_VERIFICATION_KEY = ["me", "verify-email", "resend"];

/** Profile edits, verification resends, and the public org settings. */
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
    resendEmailVerification: useMutation({
      mutationKey: RESEND_VERIFICATION_KEY,
      mutationFn: () => UserHTTPClient.resendEmailVerification(),
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
