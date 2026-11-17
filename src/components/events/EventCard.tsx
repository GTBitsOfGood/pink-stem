import Link from "next/link";
import Badge, { EventBadge } from "@/components/ui/Badge";
import EventMeta from "@/components/events/EventMeta";
import { PROGRAM_AREA_LABELS, REGION_LABELS } from "@/constants/labels";
import type { ClientEvent } from "@/http/eventHTTPClient";

export function spotsSummary(event: ClientEvent) {
  const capacity = event.shifts.reduce((sum, s) => sum + s.capacity, 0);
  const filled = event.shifts.reduce((sum, s) => sum + s.filledCount, 0);
  return { capacity, filled, open: Math.max(0, capacity - filled) };
}

export default function EventCard({
  event,
  href = `/events/${event._id}`,
  showStatus = false,
}: {
  event: ClientEvent;
  href?: string;
  showStatus?: boolean;
}) {
  const spots = spotsSummary(event);
  return (
    <Link
      href={href}
      className="group grid gap-3 rounded-2xl border border-ink-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-raised"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{PROGRAM_AREA_LABELS[event.programArea]}</Badge>
        <Badge>
          {event.isVirtual ? "Virtual" : REGION_LABELS[event.region]}
        </Badge>
        {showStatus ? <EventBadge status={event.status} /> : null}
      </div>
      <h3 className="text-lg font-bold leading-snug text-ink-900 group-hover:text-brand-800">
        {event.title}
      </h3>
      <EventMeta event={event} compact />
      <div className="mt-1 flex items-center justify-between border-t border-ink-100 pt-3 text-sm">
        <span className="text-ink-500">
          {event.shifts.length} {event.shifts.length === 1 ? "shift" : "shifts"}
        </span>
        <span
          className={
            spots.open > 0
              ? "font-semibold text-emerald-700"
              : "font-semibold text-ink-500"
          }
        >
          {spots.open > 0
            ? `${spots.open} of ${spots.capacity} spots open`
            : "Full · waitlist open"}
        </span>
      </div>
    </Link>
  );
}
