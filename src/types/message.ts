import type { Types } from "mongoose";

export const THREAD_STATUSES = ["open", "read_only"] as const;
export type ThreadStatus = (typeof THREAD_STATUSES)[number];

export interface MessageThread {
  eventId: Types.ObjectId;
  volunteerId: Types.ObjectId;
  organizerId: Types.ObjectId;
  status: ThreadStatus;
  involvesMinor: boolean;
  lastMessageAt: Date;
  /** Per-participant last-read markers, keyed by user id. */
  lastReadAt: Record<string, Date>;
  readOnlyAt?: Date | null;
  flaggedAt?: Date | null;
  flaggedBy?: Types.ObjectId | null;
  flagReason?: string;
}

export interface Message {
  threadId: Types.ObjectId;
  senderId: Types.ObjectId;
  body: string;
  sentAt: Date;
  /** Set when the message delivers an event update to the roster. */
  eventUpdateId?: Types.ObjectId | null;
  notifiedAt?: Date | null;
  reportedAt?: Date | null;
  reportedBy?: Types.ObjectId | null;
  reportReason?: string;
  /** Set when an admin has looked at the report. */
  reviewedAt?: Date | null;
  reviewedBy?: Types.ObjectId | null;
}
