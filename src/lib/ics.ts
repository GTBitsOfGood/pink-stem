const stamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const escapeText = (text: string) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");

export interface CalendarEntry {
  uid: string;
  title: string;
  description: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
  url: string;
}

/** An RFC 5545 calendar file with a single event, for "add to calendar". */
export function buildIcs(entry: CalendarEntry): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pink STEM//Volunteer Hub//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${entry.uid}@volunteer.pinkstem.org`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(entry.startsAt)}`,
    `DTEND:${stamp(entry.endsAt)}`,
    `SUMMARY:${escapeText(entry.title)}`,
    `DESCRIPTION:${escapeText(entry.description)}`,
    `LOCATION:${escapeText(entry.location)}`,
    `URL:${entry.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
