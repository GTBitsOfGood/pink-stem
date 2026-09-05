import type { EmailContent } from "@/services/mail";

/**
 * Every email the product sends, as pure functions of plain data. The
 * notification service loads the domain objects and calls in here, so
 * templates stay easy to read and easy to change.
 */

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] as string
  );

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;line-height:1.55">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`
    )
    .join("");

export interface EventDetails {
  title: string;
  date: string;
  time: string;
  where: string;
  contact: string;
  url: string;
}

interface Org {
  name: string;
  address: string;
  phone: string;
}

interface Cta {
  label: string;
  url: string;
}

/** "Assume the volunteer reads only this one message": every event email carries the essentials. */
const eventBlockHtml = (event: EventDetails) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0;border:1px solid #E6E0E8;border-radius:8px;border-collapse:separate">
    <tr><td style="padding:14px 16px">
      <div style="font-weight:700;font-size:16px;margin-bottom:8px">${escapeHtml(event.title)}</div>
      <div style="font-size:14px;line-height:1.7;color:#3F3545">
        <div><strong>When</strong> &nbsp;${escapeHtml(event.date)} · ${escapeHtml(event.time)}</div>
        <div><strong>Where</strong> &nbsp;${escapeHtml(event.where)}</div>
        <div><strong>Site contact</strong> &nbsp;${escapeHtml(event.contact)}</div>
      </div>
    </td></tr>
  </table>`;

const eventBlockText = (event: EventDetails) =>
  `\n${event.title}\nWhen: ${event.date} · ${event.time}\nWhere: ${event.where}\nSite contact: ${event.contact}\n${event.url}\n`;

function layout(
  org: Org,
  title: string,
  body: string,
  cta?: Cta,
  footerNote?: string
): string {
  return `<!doctype html><html><body style="margin:0;background:#F8F6F9;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#1A1320">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#F8F6F9"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
      <tr><td style="height:6px;background:#F400F4"></td></tr>
      <tr><td style="padding:28px 32px 8px">
        <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#9E009E">${escapeHtml(org.name)} · Volunteer Hub</div>
        <h1 style="font-size:22px;line-height:1.3;margin:12px 0 18px">${escapeHtml(title)}</h1>
        <div style="font-size:15px">${body}</div>
        ${cta ? `<p style="margin:24px 0 8px"><a href="${cta.url}" style="display:inline-block;background:#C700C7;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px">${escapeHtml(cta.label)}</a></p><p style="font-size:12px;color:#766B7C;word-break:break-all">If the button does not work, open this link: ${cta.url}</p>` : ""}
      </td></tr>
      <tr><td style="padding:18px 32px 28px;font-size:12px;line-height:1.6;color:#766B7C;border-top:1px solid #F1EDF2">
        ${footerNote ? `<div style="margin-bottom:10px">${escapeHtml(footerNote)}</div>` : ""}
        ${escapeHtml(org.name)} · ${escapeHtml(org.address)} · ${escapeHtml(org.phone)}
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function build(
  org: Org,
  subject: string,
  title: string,
  bodyText: string,
  options: {
    cta?: Cta;
    event?: EventDetails;
    footerNote?: string;
    extraHtml?: string;
    extraText?: string;
  } = {}
): EmailContent {
  const html = layout(
    org,
    title,
    paragraphs(bodyText) +
      (options.event ? eventBlockHtml(options.event) : "") +
      (options.extraHtml ?? ""),
    options.cta,
    options.footerNote
  );
  const text = [
    title,
    "",
    bodyText,
    options.event ? eventBlockText(options.event) : "",
    options.extraText ?? "",
    options.cta ? `${options.cta.label}: ${options.cta.url}` : "",
    "",
    `${org.name} · ${org.address} · ${org.phone}`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
  return { subject, html, text };
}

const PREFS_NOTE =
  "You can change which emails you receive under Profile in the Volunteer Hub. Confirmations for your own sign-ups are always sent.";

export const emailTemplates = {
  verifyEmail: (org: Org, p: { name: string; url: string }) =>
    build(
      org,
      "Verify your email for the Pink STEM Volunteer Hub",
      "Confirm your email address",
      `Hi ${p.name},\n\nThanks for volunteering with Pink STEM. Confirm your email address to finish setting up your account. Sign-ups stay pending until you do.`,
      { cta: { label: "Verify email", url: p.url } }
    ),

  passwordReset: (org: Org, p: { name: string; url: string }) =>
    build(
      org,
      "Reset your Volunteer Hub password",
      "Reset your password",
      `Hi ${p.name},\n\nUse the link below to choose a new password. It expires in 30 minutes. If you did not ask for this, you can ignore this email.`,
      { cta: { label: "Choose a new password", url: p.url } }
    ),

  organizerInvite: (
    org: Org,
    p: { inviterName: string; role: string; url: string }
  ) =>
    build(
      org,
      `You are invited to organize for ${org.name}`,
      `${p.inviterName} invited you as an ${p.role}`,
      `${p.inviterName} has invited you to the Pink STEM Volunteer Hub as an ${p.role}. Accept the invitation to set your password and get started. The link expires in seven days.`,
      { cta: { label: "Accept invitation", url: p.url } }
    ),

  guardianConsent: (org: Org, p: { volunteerName: string; url: string }) =>
    build(
      org,
      `Consent needed for ${p.volunteerName} to volunteer with Pink STEM`,
      "A parent or guardian's consent is needed",
      `${p.volunteerName} has signed up to volunteer with ${org.name} and listed you as their parent or guardian. Because they are under 18, we need your consent before they can be confirmed for any shift.\n\nPlease review and give consent using the link below. It expires in 14 days.`,
      { cta: { label: "Review and give consent", url: p.url } }
    ),

  signupConfirmed: (
    org: Org,
    p: { name: string; event: EventDetails; role: string; calendarUrl: string }
  ) =>
    build(
      org,
      `Confirmed: ${p.event.title}`,
      "You are confirmed",
      `Hi ${p.name},\n\nYour spot as ${p.role} is confirmed. Here is everything you need for the day.`,
      {
        event: p.event,
        cta: { label: "View your shift", url: p.event.url },
        extraHtml: `<p style="font-size:13px"><a href="${p.calendarUrl}" style="color:#9E009E">Add to calendar</a></p>`,
        extraText: `Add to calendar: ${p.calendarUrl}`,
      }
    ),

  signupPending: (
    org: Org,
    p: { name: string; event: EventDetails; role: string; reasons: string[] }
  ) =>
    build(
      org,
      `Almost there: ${p.event.title}`,
      "Your sign-up is pending",
      `Hi ${p.name},\n\nYou have a spot held as ${p.role}, and it will be confirmed once the following is complete:\n\n${p.reasons.map((r) => `• ${r}`).join("\n")}\n\nBackground screening is usually recorded within a week of submission. We will email you the moment your spot is confirmed.`,
      {
        event: p.event,
        cta: { label: "See what is outstanding", url: p.event.url },
      }
    ),

  waitlisted: (
    org: Org,
    p: { name: string; event: EventDetails; role: string }
  ) =>
    build(
      org,
      `Waitlisted: ${p.event.title}`,
      "You are on the waitlist",
      `Hi ${p.name},\n\nThe ${p.role} shift is full, so you are on the waitlist. If a spot opens, you will be promoted automatically in order and emailed right away.`,
      { event: p.event, cta: { label: "View the event", url: p.event.url } }
    ),

  waitlistPromoted: (
    org: Org,
    p: { name: string; event: EventDetails; role: string }
  ) =>
    build(
      org,
      `A spot opened up: ${p.event.title}`,
      "You are off the waitlist",
      `Hi ${p.name},\n\nA spot opened on the ${p.role} shift and it is now yours. If you can no longer make it, please cancel so the next person can take it.`,
      { event: p.event, cta: { label: "View your shift", url: p.event.url } }
    ),

  reminder: (
    org: Org,
    p: { name: string; event: EventDetails; role: string; hoursOut: number }
  ) =>
    build(
      org,
      `${p.hoursOut === 24 ? "Tomorrow" : "In three days"}: ${p.event.title}`,
      `Your shift is ${p.hoursOut === 24 ? "tomorrow" : "in three days"}`,
      `Hi ${p.name},\n\nA reminder that you are confirmed as ${p.role}. Please arrive a few minutes early and check in with the site contact.`,
      {
        event: p.event,
        cta: { label: "View your shift", url: p.event.url },
        footerNote: PREFS_NOTE,
      }
    ),

  importantChange: (
    org: Org,
    p: { name: string; event: EventDetails; body: string }
  ) =>
    build(
      org,
      `Important change: ${p.event.title}`,
      "Important change to your event",
      `Hi ${p.name},\n\nThe organizer posted an important change:\n\n${p.body}`,
      { event: p.event, cta: { label: "View the event", url: p.event.url } }
    ),

  eventCancelled: (
    org: Org,
    p: { name: string; event: EventDetails; reason: string }
  ) =>
    build(
      org,
      `Cancelled: ${p.event.title}`,
      "This event has been cancelled",
      `Hi ${p.name},\n\nWe are sorry: this event has been cancelled and your sign-up has been released. The organizer's explanation:\n\n${p.reason}\n\nNo hours are credited for a cancelled event. Thank you for being willing to help.`,
      {
        event: p.event,
        cta: {
          label: "Find another event",
          url: p.event.url.replace(/\/events\/.*$/, "/events"),
        },
      }
    ),

  spotLapsed: (
    org: Org,
    p: { name: string; event: EventDetails; reason: string; holdDays: number }
  ) =>
    build(
      org,
      `Action needed: ${p.event.title}`,
      "Your confirmed spot is on hold",
      `Hi ${p.name},\n\n${p.reason} Your spot is held for ${p.holdDays} days while this is resolved; after that it returns to the waitlist.`,
      {
        event: p.event,
        cta: { label: "See what is outstanding", url: p.event.url },
      }
    ),

  hoursApproved: (
    org: Org,
    p: {
      name: string;
      event: EventDetails;
      hours: string;
      certificateUrl: string;
    }
  ) =>
    build(
      org,
      `${p.hours} approved for ${p.event.title}`,
      "Your hours are approved",
      `Hi ${p.name},\n\nThank you for volunteering. The organizer approved ${p.hours} for this event, and your event certificate is ready. Your running total is on the Hours page, where you can also request a cumulative service record for applications.`,
      {
        event: p.event,
        cta: { label: "Download your certificate", url: p.certificateUrl },
      }
    ),

  newMessage: (
    org: Org,
    p: {
      name: string;
      senderName: string;
      eventTitle: string;
      preview: string;
      url: string;
    }
  ) =>
    build(
      org,
      `New message from ${p.senderName} about ${p.eventTitle}`,
      `${p.senderName} sent you a message`,
      `Hi ${p.name},\n\nAbout ${p.eventTitle}:\n\n"${p.preview}"\n\nReply in the Volunteer Hub. Replies to this email are not delivered.`,
      {
        cta: { label: "Open the conversation", url: p.url },
        footerNote:
          "Messages in the Volunteer Hub are visible to Pink STEM administrators. " +
          PREFS_NOTE,
      }
    ),

  messageDigest: (
    org: Org,
    p: {
      name: string;
      items: {
        senderName: string;
        eventTitle: string;
        count: number;
        url: string;
      }[];
    }
  ) =>
    build(
      org,
      "New messages in the Volunteer Hub",
      "You have new messages",
      `Hi ${p.name},\n\n${p.items.map((i) => `• ${i.count} new from ${i.senderName} about ${i.eventTitle}\n  ${i.url}`).join("\n")}`,
      { footerNote: PREFS_NOTE }
    ),

  noteDigest: (
    org: Org,
    p: {
      name: string;
      eventTitle: string;
      url: string;
      notes: { author: string; body: string }[];
    }
  ) =>
    build(
      org,
      `Notes for ${p.eventTitle}`,
      `Notes from your organizer: ${p.eventTitle}`,
      `Hi ${p.name},\n\n${p.notes.map((n) => `${n.author} wrote:\n${n.body}`).join("\n\n")}`,
      { cta: { label: "View the event", url: p.url }, footerNote: PREFS_NOTE }
    ),

  clearanceExpiring: (
    org: Org,
    p: { name: string; expiresOn: string; url: string }
  ) =>
    build(
      org,
      "Your volunteer clearance expires soon",
      "Time to renew your clearance",
      `Hi ${p.name},\n\nYour background screening clearance expires on ${p.expiresOn}. Once it lapses, confirmed spots on events that require clearance go on hold. Contact Pink STEM staff to renew before then.`,
      { cta: { label: "View your profile", url: p.url } }
    ),

  clearanceRecorded: (
    org: Org,
    p: { name: string; statusLabel: string; url: string }
  ) =>
    build(
      org,
      `Clearance update: ${p.statusLabel}`,
      "Your clearance record was updated",
      `Hi ${p.name},\n\nPink STEM staff recorded your screening status as: ${p.statusLabel}. Any sign-ups that were waiting on clearance have been re-checked.`,
      { cta: { label: "View your shifts", url: p.url } }
    ),

  lowFill: (
    org: Org,
    p: {
      name: string;
      eventTitle: string;
      url: string;
      shifts: { role: string; filled: number; min: number }[];
    }
  ) =>
    build(
      org,
      `Staffing alert: ${p.eventTitle}`,
      "Shifts are below minimum staffing",
      `Hi ${p.name},\n\nWith 72 hours to go, these shifts are under their minimum:\n\n${p.shifts.map((s) => `• ${s.role}: ${s.filled} of ${s.min} minimum`).join("\n")}`,
      { cta: { label: "Manage the event", url: p.url } }
    ),

  rosterNudge: (
    org: Org,
    p: { name: string; eventTitle: string; url: string; hoursSince: number }
  ) =>
    build(
      org,
      `Approve the roster: ${p.eventTitle}`,
      "Hours are waiting on your approval",
      `Hi ${p.name},\n\n${p.eventTitle} ended about ${p.hoursSince} hours ago and its roster has not been approved. Volunteers do not receive hours or certificates until you do. It takes about a minute on your phone.`,
      { cta: { label: "Approve the roster", url: p.url } }
    ),

  rosterEscalation: (
    org: Org,
    p: { name: string; eventTitle: string; organizerName: string; url: string }
  ) =>
    build(
      org,
      `Unapproved roster: ${p.eventTitle}`,
      "A roster has gone a week without approval",
      `Hi ${p.name},\n\n${p.eventTitle}, organized by ${p.organizerName}, ended seven days ago and its roster is still unapproved. As an admin you can approve it yourself.`,
      { cta: { label: "Open the event", url: p.url } }
    ),

  noShowFlag: (
    org: Org,
    p: { name: string; volunteerName: string; count: number; url: string }
  ) =>
    build(
      org,
      `Review needed: ${p.volunteerName}`,
      "A volunteer was flagged for review",
      `Hi ${p.name},\n\n${p.volunteerName} has ${p.count} no-shows in the review window. They have not been blocked; please review their record and decide.`,
      { cta: { label: "Open their profile", url: p.url } }
    ),

  messageReported: (
    org: Org,
    p: { name: string; reporterName: string; reason: string; url: string }
  ) =>
    build(
      org,
      "A message was reported",
      "A message needs your review",
      `Hi ${p.name},\n\n${p.reporterName} reported a message:\n\n"${p.reason}"`,
      { cta: { label: "Review the thread", url: p.url } }
    ),

  organizerDigest: (
    org: Org,
    p: {
      name: string;
      sections: { heading: string; lines: string[] }[];
      url: string;
    }
  ) =>
    build(
      org,
      "Your daily organizer digest",
      "Today's organizer digest",
      `Hi ${p.name},\n\n${p.sections.map((s) => `${s.heading}\n${s.lines.map((l) => `• ${l}`).join("\n")}`).join("\n\n")}`,
      { cta: { label: "Open your events", url: p.url }, footerNote: PREFS_NOTE }
    ),

  organizerNotice: (
    org: Org,
    p: {
      name: string;
      subject: string;
      title: string;
      body: string;
      url: string;
    }
  ) =>
    build(org, p.subject, p.title, `Hi ${p.name},\n\n${p.body}`, {
      cta: { label: "Open the event", url: p.url },
    }),

  certificateReissued: (org: Org, p: { name: string; url: string }) =>
    build(
      org,
      "A certificate was reissued",
      "Your certificate was updated",
      `Hi ${p.name},\n\nPink STEM corrected the hours behind one of your certificates. The original has been revoked and a replacement issued with a new verification code. If you have shared the old one, please share the new one instead.`,
      { cta: { label: "View your certificates", url: p.url } }
    ),

  signupReleased: (
    org: Org,
    p: { name: string; event: EventDetails; reason: string }
  ) =>
    build(
      org,
      `Sign-up released: ${p.event.title}`,
      "Your sign-up was released",
      `Hi ${p.name},\n\n${p.reason}`,
      { event: p.event }
    ),
};
