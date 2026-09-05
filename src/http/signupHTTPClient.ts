import fetchHTTPClient from "@/http/fetchHTTPClient";
import type { ClientSignup } from "@/http/eventHTTPClient";

export default class SignupHTTPClient {
  static create(
    shiftId: string,
    acknowledgeOverlap = false
  ): Promise<ClientSignup> {
    return fetchHTTPClient("/signups", "POST", { shiftId, acknowledgeOverlap });
  }

  static cancel(signupId: string, reason?: string): Promise<ClientSignup> {
    return fetchHTTPClient(`/signups/${signupId}/cancel`, "POST", { reason });
  }

  static approve(signupId: string): Promise<ClientSignup> {
    return fetchHTTPClient(`/signups/${signupId}/approve`, "POST");
  }

  static promote(signupId: string): Promise<ClientSignup> {
    return fetchHTTPClient(`/signups/${signupId}/promote`, "POST");
  }

  static calendarUrl(signupId: string): string {
    return `/api/v1/signups/${signupId}/calendar`;
  }
}
