/**
 * A record that a given email was sent, keyed so scheduled jobs are
 * idempotent: a 72-hour reminder for a sign-up is sent exactly once. Also
 * holds the job runner's lock, the only document with an expiresAt.
 */
export interface NotificationLog {
  key: string;
  sentAt: Date;
  expiresAt?: Date;
}
