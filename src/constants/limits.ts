/** Product rules that are fixed, not admin-configurable. */

export const SESSION_DAYS = 30;
/** Re-issue the session cookie once a token is older than this. */
export const SESSION_RENEW_AFTER_HOURS = 24;

export const PASSWORD_MIN_LENGTH = 8;
export const RESET_PASSWORD_TOKEN_MINUTES = 30;
export const ORGANIZER_INVITE_DAYS = 7;
export const GUARDIAN_CONSENT_DAYS = 14;

export const ADULT_AGE = 18;

export const REMINDER_HOURS = [72, 24] as const;
export const LOW_FILL_ALERT_HOURS = 72;
export const ROSTER_NUDGE_HOURS = [24, 72] as const;
export const ROSTER_ADMIN_ESCALATION_DAYS = 7;
export const CLEARANCE_EXPIRY_WARNING_DAYS = 30;
export const LAPSED_SPOT_HOLD_DAYS = 7;
/** Counter reconciliation leaves shifts touched this recently to in-flight writes. */
export const COUNTER_SETTLE_MINUTES = 5;
export const IMPORTANT_UPDATE_BANNER_HOURS = 12;
export const THREAD_READ_ONLY_AFTER_EVENT_DAYS = 30;
export const THREAD_READ_ONLY_AFTER_CANCEL_DAYS = 7;

export const MAX_THREADS_PER_HOUR = 10;
export const MAX_MESSAGES_PER_HOUR = 60;
export const MAX_MESSAGE_LENGTH = 2_000;
export const MAX_UPDATE_LENGTH = 2_000;
export const MAX_BIO_LENGTH = 600;
export const MAX_DESCRIPTION_LENGTH = 5_000;
export const MAX_TITLE_LENGTH = 120;
export const MAX_SHIFT_HOURS = 16;
export const MAX_SHIFTS_PER_EVENT = 20;

export const VERIFICATION_CODE_LENGTH = 16;

export const PAGE_SIZE = 25;

/** How long a crashed job run can hold the runner's lock before it lapses. */
export const JOB_LOCK_TTL_MS = 10 * 60_000;

/**
 * Rate limits, expressed as hits per fixed window. Login is limited per
 * account and address, so a neighbour's typos on a shared address do not lock
 * an account out. Looser ceilings per address stop enumeration and per
 * account stop distributed guessing, at the cost that attempts from several
 * addresses can lock an account for one window.
 */
export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60_000 },
  loginPerAccount: { limit: 50, windowMs: 15 * 60_000 },
  loginPerAddress: { limit: 100, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 5, windowMs: 60 * 60_000 },
  verify: { limit: 60, windowMs: 60_000 },
  inviteLookup: { limit: 20, windowMs: 15 * 60_000 },
  consentLookup: { limit: 20, windowMs: 15 * 60_000 },
} as const;
