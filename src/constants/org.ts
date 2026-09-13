import type { OrgSettings } from "@/types/settings";

export const ORG_TIMEZONE = "America/New_York";

/** Seeded on first run and editable by admins under Settings. */
export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  orgName: "Pink STEM, Inc.",
  addressLine1: "260 Peachtree St. NW, Suite 2200",
  addressLine2: "Atlanta, GA 30303",
  phone: "(678) 833-6950",
  email: "thead@pinksteminc.com",
  website: "https://pinkstem.org",
  signatoryName: "Dr. Tamika Head-Ray",
  signatoryTitle: "Founder & Executive Director",
  waiverVersion: 1,
  waiverText: `I understand that volunteering with Pink STEM, Inc. involves working with students, and I agree to follow the direction of Pink STEM staff and site organizers at all times.

I release Pink STEM, Inc., its staff, partners, and host sites from liability for injury or loss arising from my participation, except where caused by gross negligence.

I consent to Pink STEM recording my attendance and service hours and issuing certificates that describe them.`,
  codeOfConductText: `Volunteers are never alone with a student out of sight of staff or another adult.

Volunteers do not exchange personal contact information with students, and do not contact students outside Pink STEM programs.

Messages sent through this platform are visible to Pink STEM administrators. Threads that involve a volunteer under 18 are reviewed periodically.

Volunteers report any concern about a student's safety to the site organizer immediately.`,
  cancellationCutoffHours: 24,
  autoPromoteCutoffHours: 12,
  noShowThreshold: 3,
  noShowWindowDays: 90,
};
