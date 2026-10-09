import type { Types } from "mongoose";
import type { Region, Skill } from "@/types/user";

export const PROGRAM_AREAS = [
  "robotics",
  "cybersecurity",
  "coding",
  "aviation",
  "summer_camp",
  "tutoring",
  "stem_expo",
  "career_exploration",
  "other",
] as const;
export type ProgramArea = (typeof PROGRAM_AREAS)[number];

export const EVENT_STATUSES = [
  "draft",
  "published",
  "completed",
  "cancelled",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_VISIBILITIES = ["public", "unlisted"] as const;
export type EventVisibility = (typeof EVENT_VISIBILITIES)[number];

export const EVENT_COMMITMENTS = ["short_term", "long_term"] as const;
export type EventCommitment = (typeof EVENT_COMMITMENTS)[number];

export const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface Event {
  organizerId: Types.ObjectId;
  title: string;
  description: string;
  programArea: ProgramArea;
  status: EventStatus;
  visibility: EventVisibility;
  commitment: EventCommitment;
  /** Sessions in one long-term program share this identifier. */
  seriesId?: Types.ObjectId;
  /** Recurrence facts retained so changing the end date remains deterministic. */
  seriesWeekdays?: Weekday[];
  seriesStartDate?: Date;
  seriesEndDate?: Date;
  eventDate: Date;
  region: Region;
  isVirtual: boolean;
  virtualLink?: string;
  locationName?: string;
  address?: string;
  locationNote?: string;
  city?: string;
  requiresClearance: boolean;
  requiresApproval: boolean;
  minAge?: number;
  siteContactName?: string;
  siteContactPhone?: string;
  coverImageUrl?: string;
  cancellationReason?: string;
  publishedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  cancelledBy?: Types.ObjectId | null;
}

export interface Shift {
  eventId: Types.ObjectId;
  roleName: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  minStaffing: number;
  requiredSkills: Skill[];
  /** Spots held by pending + confirmed sign-ups. Maintained atomically. */
  filledCount: number;
  waitlistCount: number;
}

export type ShiftCounters = Pick<Shift, "filledCount" | "waitlistCount">;

export const UPDATE_KINDS = ["note", "important"] as const;
export type UpdateKind = (typeof UPDATE_KINDS)[number];

export interface EventUpdate {
  eventId: Types.ObjectId;
  authorId: Types.ObjectId;
  kind: UpdateKind;
  body: string;
  rosterOnly: boolean;
  pinned: boolean;
  postedAt: Date;
  editedAt?: Date | null;
  deletedAt?: Date | null;
  notifiedAt?: Date | null;
}
