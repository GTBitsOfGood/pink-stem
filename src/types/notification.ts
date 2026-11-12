/**
 * Why a send failed. `rejected`: Resend refused this message (a bad address
 * or field). `unavailable`: Resend could not be reached or refused us (an
 * outage, a rate limit, a bad API key), so the same email may go out later.
 */
export const MAIL_FAILURES = ["rejected", "unavailable"] as const;
export type MailFailure = (typeof MAIL_FAILURES)[number];

/**
 * Where one keyed email stands. `sending` is held by whoever is sending it
 * now, `sent` is final, and `failed` is picked up again by the next run.
 * Rows written before this field existed have no status and count as sent.
 */
export const NOTIFICATION_STATUSES = ["sending", "sent", "failed"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

/**
 * A record of one keyed email, so scheduled jobs are idempotent: a 72-hour
 * reminder for a sign-up goes out once, and a failed send is retried rather
 * than lost. Also holds expiring locks (the job runner's, and per-event
 * shift deletes), the only documents with an expiresAt.
 */
export interface NotificationLog {
  key: string;
  status?: NotificationStatus;
  /** When the current or last attempt took the key; identifies its holder. */
  claimedAt?: Date;
  sentAt?: Date;
  failedAt?: Date;
  failureKind?: MailFailure;
  lastError?: string;
  expiresAt?: Date;
}

/**
 * What became of one email. `skipped`: nothing was attempted (inactive user,
 * opted out, or the dedupe key was already sent or held by another run).
 */
export type SendOutcome = "sent" | "skipped" | "failed";

/** Per-job tally returned by the job runner. */
export type SendCounts = Record<SendOutcome, number>;
