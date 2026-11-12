import type { MailFailure } from "@/types/notification";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface OutgoingEmail extends EmailContent {
  to: string;
}

export class MailError extends Error {
  constructor(
    readonly kind: MailFailure,
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "MailError";
  }
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
/** Well under the notification claim TTL, so a hung send cannot outlive its claim. */
const SEND_TIMEOUT_MS = 15_000;
/** Resend's statuses for a malformed message, as opposed to a problem on our side or theirs. */
const REJECTED_STATUSES = new Set([400, 422]);

/**
 * Whether `to` may receive real email. `EMAIL_ALLOWED_RECIPIENTS` is a comma
 * list of domains (`example.org`) or addresses; unset allows everyone. Staging
 * sets it so testers get real email while public addresses never do.
 */
function allowed(to: string): boolean {
  const list = process.env.EMAIL_ALLOWED_RECIPIENTS?.split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (!list?.length) return true;
  const address = to.toLowerCase();
  return list.some((entry) =>
    entry.includes("@") ? address === entry : address.endsWith(`@${entry}`)
  );
}

/**
 * Transactional email transport. Sends through Resend when configured and
 * otherwise prints the message to the server log, so local development and
 * preview deploys never email real people. Recipients outside
 * `EMAIL_ALLOWED_RECIPIENTS` are logged the same way. Throws a `MailError` when the
 * email did not go out.
 */
export default class MailService {
  static async send(email: OutgoingEmail): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from =
      process.env.EMAIL_FROM ??
      "Pink STEM Volunteer Hub <volunteer@pinkstem.org>";

    if (!apiKey || !allowed(email.to)) {
      console.info(
        `[mail] To: ${email.to}\n[mail] Subject: ${email.subject}\n${email.text}\n`
      );
      return;
    }

    let response: Response;
    try {
      response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
    } catch (error) {
      throw new MailError(
        "unavailable",
        `Could not reach Resend: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new MailError(
        REJECTED_STATUSES.has(response.status) ? "rejected" : "unavailable",
        `Resend returned ${response.status}${detail ? `: ${detail}` : ""}`,
        response.status
      );
    }
  }
}
