import type { AuditAction } from "@/types/audit";
import type { CertificateType } from "@/types/certificate";
import type { EventStatus, ProgramArea, UpdateKind } from "@/types/event";
import type { PendingReason, SignupStatus } from "@/types/signup";
import type {
  ClearanceStatus,
  NotificationCategory,
  Region,
  Role,
  Skill,
} from "@/types/user";

/** Human-readable copy for every enum the UI renders. Status is never conveyed by color alone. */

export const ROLE_LABELS: Record<Role, string> = {
  volunteer: "Volunteer",
  organizer: "Organizer",
  admin: "Admin",
};

export const PROGRAM_AREA_LABELS: Record<ProgramArea, string> = {
  robotics: "Robotics & Mechatronics",
  cybersecurity: "Cybersecurity",
  coding: "Coding & Computer Science",
  aviation: "Aviation & Aerospace",
  summer_camp: "Summer Camp",
  tutoring: "Tutoring",
  stem_expo: "STEM Expo & Events",
  career_exploration: "Career Exploration",
  other: "Other",
};

export const SKILL_LABELS: Record<Skill, string> = {
  robotics: "Robotics",
  cybersecurity: "Cybersecurity",
  coding: "Coding",
  aviation: "Aviation",
  healthcare: "Healthcare",
  general_mentoring: "General mentoring",
  event_support: "Event support",
};

export const REGION_LABELS: Record<Region, string> = {
  metro_atlanta: "Metro Atlanta",
  middle_georgia: "Middle Georgia",
  other: "Other",
};

export const CLEARANCE_LABELS: Record<ClearanceStatus, string> = {
  none: "Not started",
  submitted: "Submitted",
  cleared: "Cleared",
  expired: "Expired",
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Draft",
  published: "Published",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const SIGNUP_STATUS_LABELS: Record<SignupStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  waitlisted: "Waitlisted",
  cancelled: "Cancelled",
  attended: "Attended",
  no_show: "No-show",
};

export const PENDING_REASON_LABELS: Record<PendingReason, string> = {
  email_unverified: "Verify your email address",
  waiver: "Accept the volunteer waiver and code of conduct",
  guardian_consent: "A parent or guardian must give consent",
  clearance: "Background screening must be cleared by Pink STEM staff",
  approval: "The organizer reviews and approves sign-ups for this event",
};

export const UPDATE_KIND_LABELS: Record<UpdateKind, string> = {
  note: "Note",
  important: "Important change",
};

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  event: "Event certificate",
  service_record: "Service record",
};

export const NOTIFICATION_CATEGORY_LABELS: Record<
  NotificationCategory,
  { label: string; description: string }
> = {
  reminders: {
    label: "Shift reminders",
    description: "72 hours and 24 hours before each shift you hold.",
  },
  updates: {
    label: "Event notes",
    description: "Daily digest of notes organizers post to your events.",
  },
  messages: {
    label: "Messages",
    description: "An email when an organizer messages you.",
  },
  digests: {
    label: "Organizer digest",
    description: "Daily summary of roster changes and open questions.",
  },
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "user.role_changed": "Role changed",
  "user.deactivated": "Account deactivated",
  "user.reactivated": "Account reactivated",
  "user.force_signout": "Forced sign-out",
  "user.flagged_for_review": "Flagged for review",
  "clearance.recorded": "Clearance recorded",
  "hours.approved": "Hours approved",
  "hours.adjusted": "Hours adjusted",
  "certificate.issued": "Certificate issued",
  "certificate.revoked": "Certificate revoked",
  "event.cancelled": "Event cancelled",
  "event.reassigned": "Event reassigned",
  "message.reported": "Message reported",
  "thread.admin_access": "Admin read a thread",
  "organizer.invited": "Organizer invited",
  "signup.cancelled_by_staff": "Sign-up cancelled by staff",
};
