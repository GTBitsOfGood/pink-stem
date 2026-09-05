import { PASSWORD_MIN_LENGTH } from "@/constants/limits";

/** Every user-facing error string, so copy is written once and reused. */
const ERRORS = Object.freeze({
  AUTH: {
    INVALID_CREDENTIALS: "That email and password combination is not right.",
    ACCOUNT_INACTIVE:
      "This account has been deactivated. Contact Pink STEM if you think that is a mistake.",
    EMAIL_TAKEN: "An account with this email already exists.",
    GOOGLE_ACCOUNT:
      "This email signs in with Google. Use the Google button instead.",
    PASSWORD_ACCOUNT:
      "This email signs in with a password. Enter it below instead of using Google.",
    GOOGLE_NOT_CONFIGURED: "Google sign-in is not enabled.",
    GOOGLE_TOKEN: "Google could not verify that sign-in. Try again.",
    WEAK_PASSWORD: `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include a number.`,
    TOKEN_INVALID: "This link is invalid or has already been used.",
    SESSION_REQUIRED: "Sign in to continue.",
    FORBIDDEN: "You do not have permission to do that.",
    ALREADY_VERIFIED: "This email address is already verified.",
  },
  USER: {
    NOT_FOUND: "That account does not exist.",
    GUARDIAN_EMAIL_REQUIRED:
      "Volunteers under 18 must provide a parent or guardian email.",
    GUARDIAN_EMAIL_SAME:
      "The guardian email must be different from your own email.",
    CANNOT_CHANGE_OWN_ROLE: "You cannot change your own role.",
    CANNOT_DEACTIVATE_SELF: "You cannot deactivate your own account.",
  },
  CLEARANCE: {
    EXPIRY_REQUIRED: "A cleared record needs an expiry date.",
    EXPIRY_PAST: "The expiry date must be in the future.",
  },
  EVENT: {
    NOT_FOUND: "That event does not exist.",
    NOT_PUBLISHED: "This event is not open for sign-ups.",
    NOT_EDITABLE: "Completed and cancelled events cannot be edited.",
    ALREADY_PUBLISHED: "This event is already published.",
    NO_SHIFTS: "Add at least one shift before publishing.",
    NOT_ORGANIZER: "Only the organizer of this event or an admin can do that.",
    ORGANIZER_ROLE: "Events can only be assigned to organizers or admins.",
    VIRTUAL_LINK: "Virtual events need a join link.",
    LOCATION_REQUIRED: "In-person events need a location.",
  },
  SHIFT: {
    NOT_FOUND: "That shift does not exist.",
    TIME_ORDER: "A shift must end after it starts.",
    TOO_LONG: "A shift cannot be longer than sixteen hours.",
    CAPACITY_BELOW_FILLED:
      "Capacity cannot be reduced below the number of volunteers already holding a spot.",
    MIN_STAFFING: "Minimum staffing cannot exceed capacity.",
    TOO_MANY: "An event cannot have more than twenty shifts.",
    HAS_SIGNUPS:
      "A shift with sign-ups cannot be deleted. Cancel the event instead.",
    IN_PAST: "This shift has already started.",
  },
  SIGNUP: {
    NOT_FOUND: "That sign-up does not exist.",
    ALREADY_SIGNED_UP: "You already hold a spot on this shift.",
    OVERLAP:
      "This shift overlaps another one you hold. Confirm to sign up anyway.",
    INSIDE_CUTOFF:
      "The cancellation window has closed. Message the organizer to cancel.",
    NOT_CANCELLABLE: "This sign-up can no longer be cancelled.",
    MIN_AGE: "You do not meet the minimum age for this event.",
    NOT_APPROVABLE: "Only pending sign-ups awaiting approval can be approved.",
    NOT_ON_ROSTER: "Only confirmed volunteers can be marked.",
    ADJUSTMENT_REASON: "A reason is required when changing the hours.",
  },
  ROSTER: {
    UNMARKED:
      "Mark every confirmed volunteer as attended or no-show before approving.",
    NOT_STARTED: "The roster can be approved once the event has begun.",
    ALREADY_APPROVED: "This roster has already been approved.",
  },
  UPDATE: {
    NOT_FOUND: "That update does not exist.",
    IMPORTANT_LOCKED:
      "An important change that has already been emailed cannot be deleted. Post a correction instead.",
  },
  THREAD: {
    NOT_FOUND: "That conversation does not exist.",
    NOT_PARTICIPANT: "You are not part of this conversation.",
    NOT_ON_EVENT:
      "You can only message the organizer of an event you hold a spot on.",
    VOLUNTEER_NOT_ON_ROSTER: "That volunteer is not on this event's roster.",
    READ_ONLY: "This conversation is closed and can no longer be replied to.",
    RATE_LIMITED: "You are sending messages too quickly. Wait a few minutes.",
    RECIPIENT_INACTIVE:
      "The recipient's account is no longer active. Your message was saved but no email was sent.",
  },
  CERTIFICATE: {
    NOT_FOUND: "That certificate does not exist.",
    NO_HOURS: "There are no approved hours in that period.",
    ALREADY_REVOKED: "That certificate has already been revoked.",
    PERIOD: "The period end must be after the period start.",
  },
  JOBS: {
    UNAUTHORIZED: "Invalid job runner secret.",
  },
});

export default ERRORS;
