import fetchHTTPClient from "@/http/fetchHTTPClient";
import type { ClientCertificate } from "@/http/userHTTPClient";
import type { VerificationResult } from "@/types/certificate";
import type { Serialized } from "@/types/models";

export type ClientVerification = Serialized<VerificationResult>;

export default class CertificateHTTPClient {
  static verify(code: string): Promise<ClientVerification> {
    return fetchHTTPClient(`/verify/${encodeURIComponent(code)}`);
  }

  static pdfUrl(certificateId: string): string {
    return `/api/v1/certificates/${certificateId}/pdf`;
  }

  static revoke(
    certificateId: string,
    reason: string
  ): Promise<ClientCertificate> {
    return fetchHTTPClient(`/certificates/${certificateId}/revoke`, "POST", {
      reason,
    });
  }
}
