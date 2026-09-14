"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { QUERY_KEYS } from "@/constants/queryKeys";
import AuthHTTPClient, { RegisterBody } from "@/http/authHTTPClient";
import type { LoginInput, ResetPasswordInput } from "@/utils/validation/auth";

/** Sign-in flows. Each lands the user on `next` and reloads the session. */
export function useAuthActions(next = "/dashboard") {
  const queryClient = useQueryClient();
  const router = useRouter();

  const onSignedIn = async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });
    router.push(next);
    router.refresh();
  };

  return {
    login: useMutation({
      mutationFn: (body: LoginInput) => AuthHTTPClient.login(body),
      onSuccess: onSignedIn,
    }),
    register: useMutation({
      mutationFn: (body: RegisterBody) => AuthHTTPClient.register(body),
      onSuccess: onSignedIn,
    }),
    google: useMutation({
      mutationFn: (credential: string) =>
        AuthHTTPClient.loginWithGoogle(credential),
      onSuccess: onSignedIn,
    }),
    resetPassword: useMutation({
      mutationFn: (body: ResetPasswordInput) =>
        AuthHTTPClient.resetPassword(body),
      onSuccess: onSignedIn,
    }),
    acceptInvite: useMutation({
      mutationFn: ({
        token,
        ...body
      }: {
        token: string;
        firstName: string;
        lastName: string;
        password: string;
      }) => AuthHTTPClient.acceptInvite(token, body),
      onSuccess: onSignedIn,
    }),
    forgotPassword: useMutation({
      mutationFn: (email: string) => AuthHTTPClient.forgotPassword(email),
    }),
  };
}
