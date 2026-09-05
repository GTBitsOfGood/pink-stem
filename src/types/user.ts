import type { Types } from "mongoose";

export const ROLES = ["volunteer", "organizer", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["active", "inactive"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const AUTH_PROVIDERS = ["password", "google"] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const SKILLS = [
  "robotics",
  "cybersecurity",
  "coding",
  "aviation",
  "healthcare",
  "general_mentoring",
  "event_support",
] as const;
export type Skill = (typeof SKILLS)[number];

export const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;
export type ShirtSize = (typeof SHIRT_SIZES)[number];

export const REGIONS = ["metro_atlanta", "middle_georgia", "other"] as const;
export type Region = (typeof REGIONS)[number];

export const NOTIFICATION_CATEGORIES = [
  "reminders",
  "updates",
  "messages",
  "digests",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export type NotificationPreferences = Record<NotificationCategory, boolean>;

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface User {
  email: string;
  passwordHash?: string;
  provider: AuthProvider;
  role: Role;
  status: UserStatus;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  region?: Region;
  dateOfBirth?: Date;
  guardianEmail?: string;
  guardianConsentAt?: Date | null;
  emergencyContact?: EmergencyContact;
  skills: Skill[];
  interests: Skill[];
  shirtSize?: ShirtSize;
  bio?: string;
  waiverVersionAccepted?: number;
  waiverAcceptedAt?: Date;
  notificationPreferences: NotificationPreferences;
  /** Bumped to invalidate every existing session for this user. */
  sessionVersion: number;
  /** Set when repeated no-shows put the volunteer up for admin review. */
  flaggedForReviewAt?: Date | null;
  deactivatedAt?: Date | null;
}

/** Fields that never leave the server. */
export const USER_PRIVATE_FIELDS = ["passwordHash", "sessionVersion"] as const;
export type SafeUser = Omit<User, (typeof USER_PRIVATE_FIELDS)[number]>;

/** What another user (an organizer looking at a roster) is allowed to see. */
export interface UserSummary {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  skills: Skill[];
  role: Role;
  status: UserStatus;
}

export const CLEARANCE_STATUSES = [
  "none",
  "submitted",
  "cleared",
  "expired",
] as const;
export type ClearanceStatus = (typeof CLEARANCE_STATUSES)[number];

export interface Clearance {
  userId: Types.ObjectId;
  status: ClearanceStatus;
  clearedOn?: Date | null;
  expiresOn?: Date | null;
  recordedBy?: Types.ObjectId | null;
  notes?: string;
}
