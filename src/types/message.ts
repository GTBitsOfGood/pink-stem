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
  notifiedAt?: Date | null;
  reportedAt?: Date | null;
  reportedBy?: Types.ObjectId | null;
  reportReason?: string;
}
