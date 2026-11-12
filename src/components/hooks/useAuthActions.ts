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

/**
 * Sign-in and password flows. Sign-ins land the user on `next` and reload the
 * session; registering only reloads it, so the page can explain email
 * verification before the user moves on.
 */
export function useAuthActions(next = "/dashboard") {
  const queryClient = useQueryClient();
  const router = useRouter();

  const reloadSession = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });
  const onSignedIn = async () => {
    await reloadSession();
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
      onSuccess: reloadSession,
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
