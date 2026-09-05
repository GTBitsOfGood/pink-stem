import type { Types } from "mongoose";

export const CERTIFICATE_TYPES = ["event", "service_record"] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

export interface CertificateItem {
  eventId: Types.ObjectId;
  eventTitle: string;
  eventDate: Date;
  roleName: string;
  hours: number;
}

/**
 * Everything the PDF needs, frozen at issue time. A certificate is never
 * edited; corrections revoke it and issue a replacement.
 */
export interface Certificate {
  volunteerId: Types.ObjectId;
  type: CertificateType;
  eventId?: Types.ObjectId | null;
  volunteerName: string;
  periodStart: Date;
  periodEnd: Date;
  totalHours: number;
  items: CertificateItem[];
  signatoryName: string;
  signatoryTitle: string;
  verificationCode: string;
  issuedAt: Date;
  revokedAt?: Date | null;
  revokedBy?: Types.ObjectId | null;
  revocationReason?: string;
  supersededBy?: Types.ObjectId | null;
}

/** The only fields the public verification page is allowed to show. */
export interface VerificationResult {
  status: "valid" | "revoked" | "not_found";
  volunteerName?: string;
  totalHours?: number;
  periodStart?: Date;
  periodEnd?: Date;
  issuedAt?: Date;
  type?: CertificateType;
}
