/**
 * A record that a given email was sent, keyed so scheduled jobs are
 * idempotent: a 72-hour reminder for a sign-up is sent exactly once. Also
 * holds expiring locks (the job runner's, and per-event shift deletes), the
 * only documents with an expiresAt.
 */
export interface NotificationLog {
  key: string;
  sentAt: Date;
  expiresAt?: Date;
}
