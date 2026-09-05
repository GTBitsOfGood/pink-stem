import fetchHTTPClient from "@/http/fetchHTTPClient";
import type { MeResponse } from "@/types/api";
import type { Doc, Serialized } from "@/types/models";
import type { Role, SafeUser } from "@/types/user";
import type {
  AcceptInviteInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "@/utils/validation/auth";

export type Me = Serialized<MeResponse>;
export type ClientUser = Serialized<Doc<SafeUser>>;

/** Wire shape: dates are sent as ISO strings. */
export type RegisterBody = Omit<RegisterInput, "dateOfBirth"> & {
  dateOfBirth: string;
};

export default class AuthHTTPClient {
  static me(): Promise<Me | null> {
    return fetchHTTPClient<Me | null>("/auth/me");
  }

  static register(body: RegisterBody): Promise<ClientUser> {
    return fetchHTTPClient("/auth/register", "POST", body);
  }

  static login(body: LoginInput): Promise<ClientUser> {
    return fetchHTTPClient("/auth/login", "POST", body);
  }

  static loginWithGoogle(credential: string): Promise<ClientUser> {
    return fetchHTTPClient("/auth/google", "POST", { credential });
  }

  static logout(): Promise<void> {
    return fetchHTTPClient("/auth/logout", "POST");
  }

  static verifyEmail(token: string): Promise<void> {
    return fetchHTTPClient("/auth/verify-email", "POST", { token });
  }

  static resendVerification(): Promise<void> {
    return fetchHTTPClient("/auth/verify-email", "PUT");
  }

  static forgotPassword(email: string): Promise<void> {
    return fetchHTTPClient("/auth/forgot-password", "POST", { email });
  }

  static resetPassword(body: ResetPasswordInput): Promise<ClientUser> {
    return fetchHTTPClient("/auth/reset-password", "POST", body);
  }

  static getInvite(
    token: string
  ): Promise<{ email: string; role: Role; existingAccount: boolean }> {
    return fetchHTTPClient(`/auth/invite/${token}`);
  }

  static acceptInvite(
    token: string,
    body: Omit<AcceptInviteInput, "token">
  ): Promise<ClientUser> {
    return fetchHTTPClient(`/auth/invite/${token}`, "POST", body);
  }
}
