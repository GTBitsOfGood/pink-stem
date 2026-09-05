import { ORG_TIMEZONE } from "@/constants/org";
import { ADULT_AGE } from "@/constants/limits";

/**
 * Every date the product shows is rendered in Pink STEM's time zone, on the
 * server and in the browser alike. Volunteers and events are in Georgia, and
 * a fixed zone keeps emails, PDFs, and pages in agreement.
 */
type DateLike = Date | string | number;

const toDate = (value: DateLike) => new Date(value);

const format = (value: DateLike, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: ORG_TIMEZONE,
    ...options,
  }).format(toDate(value));

export const formatDate = (value: DateLike) =>
  format(value, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const formatLongDate = (value: DateLike) =>
  format(value, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export const formatShortDate = (value: DateLike) =>
  format(value, { month: "short", day: "numeric", year: "numeric" });

export const formatMonthYear = (value: DateLike) =>
  format(value, { month: "long", year: "numeric" });

const formatTime = (value: DateLike) =>
  format(value, { hour: "numeric", minute: "2-digit" });

export const formatTimeRange = (start: DateLike, end: DateLike) =>
  `${formatTime(start)} – ${formatTime(end)}`;

export const formatDateTime = (value: DateLike) =>
  `${formatDate(value)} · ${formatTime(value)}`;

export const formatRelative = (value: DateLike) => {
  const diffMs = toDate(value).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (abs < 60 * 60_000)
    return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (abs < 24 * 60 * 60_000)
    return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  return rtf.format(Math.round(diffMs / 86_400_000), "day");
};

/** Scheduled shift length, rounded to the nearest quarter hour. */
export const hoursBetween = (start: DateLike, end: DateLike) =>
  Math.max(
    0,
    Math.round(
      ((toDate(end).getTime() - toDate(start).getTime()) / 3_600_000) * 4
    ) / 4
  );

export const formatHours = (hours: number) => {
  const rounded = Math.round(hours * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2).replace(/0$/, "")} hr`;
};

export const addHours = (value: DateLike, hours: number) =>
  new Date(toDate(value).getTime() + hours * 3_600_000);

export const addDays = (value: DateLike, days: number) =>
  addHours(value, days * 24);

export const ageOn = (dateOfBirth: DateLike, on: DateLike = new Date()) => {
  const dob = toDate(dateOfBirth);
  const at = toDate(on);
  let age = at.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    at.getUTCMonth() < dob.getUTCMonth() ||
    (at.getUTCMonth() === dob.getUTCMonth() &&
      at.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
};

export const isMinor = (dateOfBirth?: DateLike | null) =>
  dateOfBirth != null && ageOn(dateOfBirth) < ADULT_AGE;

const partsInZone = (value: DateLike) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ORG_TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(toDate(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
};

/** Offset (ms) between UTC and the org zone at a given instant. */
const zoneOffsetMs = (value: Date) => {
  const p = partsInZone(value);
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
    value.getTime()
  );
};

/** `YYYY-MM-DDTHH:mm` in the org zone, the value a datetime-local input expects. */
export const toDateTimeLocal = (value: DateLike) => {
  const p = partsInZone(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
};

/** `YYYY-MM-DD` in the org zone, the value a date input expects. */
export const toDateInput = (value: DateLike) =>
  toDateTimeLocal(value).slice(0, 10);

/** Interprets a datetime-local (or date) string as wall-clock time in the org zone. */
export const fromDateTimeLocal = (value: string): Date => {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const utc = guess - zoneOffsetMs(new Date(guess));
  // Second pass corrects instants that fall on a daylight-saving boundary.
  return new Date(guess - zoneOffsetMs(new Date(utc)));
};

/** Start of the org-zone day containing the instant. */
export const startOfDay = (value: DateLike) =>
  fromDateTimeLocal(toDateInput(value));
