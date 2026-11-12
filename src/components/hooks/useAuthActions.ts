"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { QUERY_KEYS } from "@/constants/queryKeys";
import AuthHTTPClient, { RegisterBody } from "@/http/authHTTPClient";
import type {
  ChangePasswordInput,
  LoginInput,
  ResetPasswordInput,
} from "@/utils/validation/auth";

/** `href` if it is a path on this site (one leading `/`); `//host` and `/\host` resolve elsewhere. */
function sameOriginUrl(href: string) {
  const { origin } = window.location;
  try {
    const url = new URL(href, origin);
    return href.startsWith("/") && url.origin === origin ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** Sign-in and password flows. Sign-ins land the user on `next` if it is on this site, and reload the session. */
export function useAuthActions(next = "/dashboard") {
  const queryClient = useQueryClient();
  const router = useRouter();

  const onSignedIn = async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });
    router.push(sameOriginUrl(next) ?? "/dashboard");
    router.refresh();
  };

  return {
    login: useMutation({
      mutationFn: (body: LoginInput) => AuthHTTPClient.login(body),
      onSuccess: onSignedIn,
    }),
    register: useMutation({
      mutationFn: (body: RegisterBody) => AuthHTTPClient.register(body),
      // Stay on the page so it can explain email verification.
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session }),
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
    changePassword: useMutation({
      mutationFn: (body: ChangePasswordInput) =>
        AuthHTTPClient.changePassword(body),
    }),
  };
}
