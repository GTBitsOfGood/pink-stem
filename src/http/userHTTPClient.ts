import fetchHTTPClient from "@/http/fetchHTTPClient";
import type { Me } from "@/http/authHTTPClient";
import type { HoursSummary, SignupWithContext } from "@/types/api";
import type { Certificate } from "@/types/certificate";
import type { Doc, Serialized } from "@/types/models";
import type { PublicSettings } from "@/services/settings";
import type { UpdateProfileInput } from "@/utils/validation/user";

export type ProfileBody = Omit<UpdateProfileInput, "dateOfBirth"> & {
  dateOfBirth?: string;
};
export type ClientSignupWithContext = Serialized<SignupWithContext>;
export type ClientHoursSummary = Serialized<HoursSummary>;
export type ClientCertificate = Serialized<Doc<Certificate>>;

export interface ConsentInfo {
  volunteerName: string;
  guardianEmail: string;
  alreadyConsented: boolean;
  orgName: string;
  waiverText: string;
  codeOfConductText: string;
}

interface VerifyEmailInfo {
  firstName: string;
  alreadyVerified: boolean;
}

export default class UserHTTPClient {
  static updateProfile(body: ProfileBody): Promise<Me> {
    return fetchHTTPClient("/me", "PATCH", body);
  }

  static acceptWaiver(): Promise<Me> {
    return fetchHTTPClient("/me/waiver", "POST");
  }

  static resendGuardianConsent(): Promise<void> {
    return fetchHTTPClient("/me/guardian-consent", "POST");
  }

  static resendEmailVerification(): Promise<void> {
    return fetchHTTPClient("/me/verify-email", "POST");
  }

  static mySignups(): Promise<ClientSignupWithContext[]> {
    return fetchHTTPClient("/me/signups");
  }

  static myHours(): Promise<ClientHoursSummary> {
    return fetchHTTPClient("/me/hours");
  }

  static requestServiceRecord(
    periodStart: string,
    periodEnd: string
  ): Promise<ClientCertificate> {
    return fetchHTTPClient("/me/certificates", "POST", {
      periodStart,
      periodEnd,
    });
  }

  static consentInfo(token: string): Promise<ConsentInfo> {
    return fetchHTTPClient(`/consent/${token}`);
  }

  static giveConsent(token: string): Promise<{ volunteerName: string }> {
    return fetchHTTPClient(`/consent/${token}`, "POST");
  }

  static verifyEmailInfo(token: string): Promise<VerifyEmailInfo> {
    return fetchHTTPClient(`/verify-email/${token}`);
  }

  static confirmEmailVerification(token: string): Promise<void> {
    return fetchHTTPClient(`/verify-email/${token}`, "POST");
  }

  static publicSettings(): Promise<PublicSettings> {
    return fetchHTTPClient("/settings");
  }
}
