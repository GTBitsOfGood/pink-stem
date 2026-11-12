import type { ReactNode } from "react";
import { CalendarDays, MapPin, Phone, ShieldCheck, Video } from "lucide-react";
import type { ClientEvent } from "@/http/eventHTTPClient";
import { formatLongDate, formatTimeRange } from "@/lib/dates";
import { REGION_LABELS } from "@/constants/labels";

/** Only http(s) links become clickable; the form accepts any URL scheme. */
const isWebLink = (url: string) => /^https?:\/\//i.test(url);

/** When, where, who to call. The same block the emails carry. */
export default function EventMeta({
  event,
  compact = false,
}: {
  event: ClientEvent;
  compact?: boolean;
}) {
  const shifts = event.shifts;
  const first = shifts[0];
  const last = shifts[shifts.length - 1];
  const rows: { icon: ReactNode; text: ReactNode }[] = [
    {
      icon: <CalendarDays className="h-4 w-4" />,
      text:
        first && last
          ? `${formatLongDate(event.eventDate)} · ${formatTimeRange(first.startsAt, last.endsAt)}`
          : formatLongDate(event.eventDate),
    },
    event.isVirtual
      ? {
          icon: <Video className="h-4 w-4" />,
          // The API only includes the link for confirmed volunteers, the
          // organizer and admins.
          text:
            !compact && event.virtualLink && isWebLink(event.virtualLink) ? (
              <>
                Virtual event ·{" "}
                <a
                  href={event.virtualLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all font-medium text-brand-700 underline"
                >
                  Join link
                </a>
              </>
            ) : (
              "Virtual event"
            ),
        }
      : {
          icon: <MapPin className="h-4 w-4" />,
          text:
            [
              event.locationName,
              event.address,
              compact ? null : event.locationNote,
            ]
              .filter(Boolean)
              .join(" · ") || REGION_LABELS[event.region],
        },
  ];
  if (!compact && event.siteContactName) {
    rows.push({
      icon: <Phone className="h-4 w-4" />,
      text: `${event.siteContactName}${event.siteContactPhone ? ` · ${event.siteContactPhone}` : ""}`,
    });
  }
  if (!compact && event.requiresClearance) {
    rows.push({
      icon: <ShieldCheck className="h-4 w-4" />,
      text: "Background clearance required before confirmation",
    });
  }
  return (
    <ul className="grid gap-1.5 text-sm text-ink-600">
      {rows.map((row, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-brand-600">{row.icon}</span>
          <span>{row.text}</span>
        </li>
      ))}
    </ul>
  );
}
