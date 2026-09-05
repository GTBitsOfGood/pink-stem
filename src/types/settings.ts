/** Organization-wide configuration. A single document, edited by admins. */
export interface OrgSettings {
  orgName: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  email: string;
  website: string;
  signatoryName: string;
  signatoryTitle: string;
  waiverVersion: number;
  waiverText: string;
  codeOfConductText: string;
  cancellationCutoffHours: number;
  autoPromoteCutoffHours: number;
  noShowThreshold: number;
  noShowWindowDays: number;
}
