import juno from "juno-sdk";
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

/** Replies are not read, so the default sender says so. */
export const DEFAULT_FROM = "Pink STEM <no-reply@pinkstem.org>";
const JUNO_URL = "https://api.juno.bitsofgood.org";
/** Well under the notification claim TTL, so a hung send cannot outlive its claim. */
const SEND_TIMEOUT_MS = 15_000;
/** Juno's statuses for a message it or SendGrid refused, as opposed to an outage or a bad key. */
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

/** "Pink STEM <no-reply@pinkstem.org>" as Juno's sender object. */
function parseSender(from: string): { name: string; email: string } {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  return match
    ? { name: match[1] || match[2], email: match[2] }
    : { name: from, email: from };
}

/** The key and URL the SDK was last set up with. */
let junoSetup: string | undefined;

/**
 * Transactional email transport. Sends through Bits of Good's Juno email
 * service when `JUNO_API_KEY` is set, and otherwise prints the message to the
 * server log, so local development and preview deploys never email real
 * people. Recipients outside `EMAIL_ALLOWED_RECIPIENTS` are logged the same
 * way. Throws a `MailError` when the email did not go out.
 */
export default class MailService {
  static async send(email: OutgoingEmail): Promise<void> {
    const apiKey = process.env.JUNO_API_KEY;
    const from = process.env.EMAIL_FROM || DEFAULT_FROM;

    if (!apiKey || !allowed(email.to)) {
      console.info(
        `[mail] From: ${from}\n[mail] To: ${email.to}\n[mail] Subject: ${email.subject}\n${email.text}\n`
      );
      return;
    }

    const baseURL = process.env.JUNO_BASE_URL || JUNO_URL;
    if (junoSetup !== `${apiKey} ${baseURL}`) {
      juno.init({ apiKey, baseURL });
      junoSetup = `${apiKey} ${baseURL}`;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const sent = await Promise.race([
        juno.email.sendEmail({
          recipients: [{ email: email.to }],
          sender: parseSender(from),
          subject: email.subject,
          // SendGrid wants the plain-text part first.
          contents: [
            { type: "text/plain", value: email.text },
            { type: "text/html", value: email.html },
          ],
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new MailError("unavailable", "Juno timed out")),
            SEND_TIMEOUT_MS
          );
        }),
      ]);
      if (!sent.success)
        throw new MailError("unavailable", "Juno did not send the email");
    } catch (error) {
      if (error instanceof MailError) throw error;
      // The SDK attaches the HTTP response when Juno answers with an error,
      // names network failures FetchError, and otherwise refused the message.
      const response = (error as { response?: Response }).response;
      if (response) {
        const detail = await response.text().catch(() => "");
        throw new MailError(
          REJECTED_STATUSES.has(response.status) ? "rejected" : "unavailable",
          `Juno returned ${response.status}${detail ? `: ${detail}` : ""}`,
          response.status
        );
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new MailError(
        (error as Error)?.name === "FetchError" ? "unavailable" : "rejected",
        `Could not send through Juno: ${message}`
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
