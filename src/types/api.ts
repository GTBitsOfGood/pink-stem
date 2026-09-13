import type { Certificate } from "@/types/certificate";
import type { Event, EventUpdate, Shift } from "@/types/event";
import type { Message, MessageThread } from "@/types/message";
import type { Doc } from "@/types/models";
import type { HoursLedgerEntry, PendingReason, Signup } from "@/types/signup";
import type {
  Clearance,
  ClearanceStatus,
  SafeUser,
  UserSummary,
} from "@/types/user";
import type { AuditLog } from "@/types/audit";

/**
 * Composite shapes the API returns. Client code reads them through
 * `Serialized<...>` so each shape is declared exactly once.
 */

export type EventWithShifts = Doc<Event> & {
  shifts: Doc<Shift>[];
  organizerName: string;
};

export type UpdateWithAuthor = Doc<EventUpdate> & { authorName: string };

export interface EventDetail extends EventWithShifts {
  mySignups: Doc<Signup>[];
  updates: UpdateWithAuthor[];
  canManage: boolean;
}

export interface SignupWithContext {
  signup: Doc<Signup>;
  shift: Doc<Shift>;
  event: Doc<Event>;
}

export interface RosterEntry {
  signup: Doc<Signup>;
  volunteer: UserSummary;
  /** Organizers see a yes/no flag, never the screening record. */
  cleared: boolean;
}

export interface Roster {
  event: Doc<Event>;
  shifts: Doc<Shift>[];
  entries: RosterEntry[];
}

export interface MeResponse {
  user: Doc<SafeUser>;
  clearance: Pick<Clearance, "status" | "expiresOn"> | null;
  isMinor: boolean;
  /** Account-level items that keep every sign-up pending. */
  outstanding: PendingReason[];
  waiverVersion: number;
  unreadMessages: number;
}

export type LedgerEntryWithEvent = Doc<HoursLedgerEntry> & {
  eventTitle: string;
  eventDate: Date;
};

export interface HoursSummary {
  total: number;
  entries: LedgerEntryWithEvent[];
  certificates: Doc<Certificate>[];
}

export interface ThreadSummary {
  thread: Doc<MessageThread>;
  eventTitle: string;
  counterpartName: string;
  lastMessage: Pick<Message, "body" | "sentAt" | "senderId"> | null;
  unread: number;
  reported: boolean;
}

export interface ThreadDetail {
  thread: Doc<MessageThread>;
  messages: Doc<Message>[];
  eventId: string;
  eventTitle: string;
  participants: {
    volunteer: { id: string; name: string };
    organizer: { id: string; name: string };
  };
  canReply: boolean;
  isAdminView: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type PersonRow = Doc<SafeUser> & {
  clearanceStatus: ClearanceStatus;
  clearanceExpiresOn: Date | null;
  hours: number;
};

export interface PersonDetail {
  user: Doc<SafeUser>;
  clearance: Doc<Clearance> | null;
  signups: SignupWithContext[];
  ledger: LedgerEntryWithEvent[];
  certificates: Doc<Certificate>[];
  audit: AuditRow[];
  threadCount: number;
}

export type AuditRow = Doc<AuditLog> & { actorName: string };

export interface ReportColumn {
  key: string;
  header: string;
}

export interface Report {
  kind: string;
  from: Date;
  to: Date;
  columns: ReportColumn[];
  rows: Record<string, string | number | Date | null>[];
  summary: { label: string; value: string }[];
}

export interface AdminOverview {
  volunteers: number;
  organizers: number;
  upcomingEvents: number;
  pendingClearances: number;
  flaggedVolunteers: number;
  unapprovedRosters: number;
  totalHours: number;
  certificatesIssued: number;
  lowFillShifts: number;
  upcoming: EventWithShifts[];
  recentAudit: AuditRow[];
}
