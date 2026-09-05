"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClientEvent } from "@/http/eventHTTPClient";
import { formatMonthYear, toDateInput } from "@/lib/dates";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Month grid; events land on their org-zone date. */
export default function EventCalendar({ events }: { events: ClientEvent[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const byDay = new Map<string, ClientEvent[]>();
  for (const event of events) {
    const key = toDateInput(event.eventDate);
    byDay.set(key, [...(byDay.get(key) ?? []), event]);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = toDateInput(new Date());

  return (
    <div className="rounded-2xl border border-ink-200 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="rounded-lg p-1.5 hover:bg-ink-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-sm font-bold text-ink-900">
          {formatMonthYear(new Date(year, month, 15))}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="rounded-lg p-1.5 hover:bg-ink-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 border-b border-ink-100 text-center text-[11px] font-bold uppercase tracking-wide text-ink-500">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div
            key={`pad-${i}`}
            className="min-h-20 border-b border-r border-ink-100 bg-ink-50/50"
          />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = `${year}-${pad(month + 1)}-${pad(day)}`;
          const dayEvents = byDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={cn(
                "min-h-20 border-b border-r border-ink-100 p-1.5",
                key === today && "bg-brand-50/60"
              )}
            >
              <p
                className={cn(
                  "mb-1 text-xs font-semibold",
                  key === today ? "text-brand-700" : "text-ink-500"
                )}
              >
                {day}
              </p>
              <div className="grid gap-1">
                {dayEvents.map((event) => (
                  <Link
                    key={event._id}
                    href={`/events/${event._id}`}
                    className="truncate rounded-md bg-brand-100 px-1.5 py-0.5 text-[11px] font-semibold text-brand-900 hover:bg-brand-200"
                    title={event.title}
                  >
                    {event.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
