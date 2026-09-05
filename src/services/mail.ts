export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface OutgoingEmail extends EmailContent {
  to: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Transactional email transport. Sends through Resend when configured and
 * otherwise prints the message to the server log, so local development and
 * preview deploys never email real people.
 */
export default class MailService {
  static async send(email: OutgoingEmail): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from =
      process.env.EMAIL_FROM ??
      "Pink STEM Volunteer Hub <volunteer@pinkstem.org>";

    if (!apiKey) {
      console.info(
        `[mail] To: ${email.to}\n[mail] Subject: ${email.subject}\n${email.text}\n`
      );
      return;
    }

    const response = await fetch(RESEND_ENDPOINT, {
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
    });

    if (!response.ok) {
      console.error(
        `[mail] Resend rejected "${email.subject}" to ${email.to}: ${response.status}`
      );
    }
  }

  static async sendMany(emails: OutgoingEmail[]): Promise<void> {
    await Promise.all(emails.map((email) => MailService.send(email)));
  }
}
