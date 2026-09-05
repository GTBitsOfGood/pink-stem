"use client";

import { ReactNode, useState } from "react";
import { CalendarDays, List } from "lucide-react";
import EventCalendar from "@/components/events/EventCalendar";
import EventCard from "@/components/events/EventCard";
import EventFilters, {
  EMPTY_EVENT_FILTERS,
  EventFilterValues,
} from "@/components/events/EventFilters";
import { useEventList } from "@/components/hooks/useEvents";
import Container from "@/components/layout/Container";
import {
  EmptyState,
  PageHeader,
  Pagination,
  Spinner,
} from "@/components/ui/Primitives";
import { cn } from "@/lib/utils";

export default function EventsPage() {
  const [filters, setFilters] =
    useState<EventFilterValues>(EMPTY_EVENT_FILTERS);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [page, setPage] = useState(1);
  const events = useEventList({
    ...filters,
    hasSpots: filters.hasSpots ? "true" : "",
    page: String(page),
  });

  const viewButton = (value: typeof view, label: string, icon: ReactNode) => (
    <button
      type="button"
      onClick={() => setView(value)}
      aria-pressed={view === value}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold",
        view === value
          ? "bg-ink-900 text-white"
          : "text-ink-600 hover:bg-ink-100"
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        eyebrow="Find a shift"
        title="Upcoming volunteer events"
        description="Pick a role and a time that fits. Sign-up takes a minute; Pink STEM staff clear every volunteer before they work with students."
        action={
          <div className="flex gap-1 rounded-xl border border-ink-200 bg-white p-1">
            {viewButton("list", "List", <List className="h-4 w-4" />)}
            {viewButton(
              "calendar",
              "Calendar",
              <CalendarDays className="h-4 w-4" />
            )}
          </div>
        }
      />
      <EventFilters
        values={filters}
        onChange={(v) => {
          setFilters(v);
          setPage(1);
        }}
      />
      <div className="mt-6">
        {events.isPending ? (
          <Spinner label="Loading events" />
        ) : events.isError ? (
          <EmptyState
            title="Events could not be loaded"
            description="Please refresh the page to try again."
          />
        ) : !events.data.items.length ? (
          <EmptyState
            title="No events match"
            description="Try widening the date range or clearing a filter. New events are posted regularly."
          />
        ) : view === "calendar" ? (
          <EventCalendar events={events.data.items} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {events.data.items.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
            <Pagination
              page={events.data.page}
              total={events.data.total}
              pageSize={events.data.pageSize}
              onPage={setPage}
            />
          </>
        )}
      </div>
    </Container>
  );
}
