"use client";

import { Plus } from "lucide-react";
import EventCard, { spotsSummary } from "@/components/events/EventCard";
import { useOrganizerEvents } from "@/components/hooks/useEvents";
import { useNow } from "@/components/hooks/useNow";
import Container from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Stat } from "@/components/ui/Card";
import { EmptyState, PageHeader, Spinner } from "@/components/ui/Primitives";
import type { ClientEvent } from "@/http/eventHTTPClient";

function Section({ title, events }: { title: string; events: ClientEvent[] }) {
  if (!events.length) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-ink-900">
        {title}{" "}
        <span className="text-sm font-semibold text-ink-400">
          {events.length}
        </span>
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => (
          <EventCard
            key={event._id}
            event={event}
            href={`/organizer/events/${event._id}`}
            showStatus
          />
        ))}
      </div>
    </section>
  );
}

export default function OrganizerPage() {
  const events = useOrganizerEvents();
  const all = events.data ?? [];
  const now = useNow();
  const drafts = all.filter((e) => e.status === "draft");
  const upcoming = all.filter(
    (e) =>
      e.status === "published" &&
      new Date(e.eventDate).getTime() >= now - 86_400_000
  );
  const needApproval = all.filter(
    (e) =>
      e.status === "published" &&
      new Date(e.eventDate).getTime() < now - 86_400_000
  );
  const past = all
    .filter((e) => e.status === "completed" || e.status === "cancelled")
    .reverse();
  const openSpots = upcoming.reduce((sum, e) => sum + spotsSummary(e).open, 0);

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        eyebrow="Organize"
        title="Your events"
        description="Post shifts, watch them fill, mark attendance on the day, and approve hours before you leave the building."
        action={
          <ButtonLink
            href="/organizer/events/new"
            icon={<Plus className="h-4 w-4" />}
          >
            New event
          </ButtonLink>
        }
      />
      {events.isPending ? (
        <Spinner />
      ) : !all.length ? (
        <EmptyState
          title="No events yet"
          description="Create your first event, add shifts with roles and times, and publish it when it is ready."
          action={
            <ButtonLink href="/organizer/events/new">
              Create an event
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Upcoming published" value={upcoming.length} />
            <Stat label="Open spots" value={openSpots} tone="brand" />
            <Stat
              label="Rosters to approve"
              value={needApproval.length}
              hint={
                needApproval.length ? "Hours post when you approve" : undefined
              }
            />
          </div>
          <Section title="Rosters waiting for approval" events={needApproval} />
          <Section title="Upcoming" events={upcoming} />
          <Section title="Drafts" events={drafts} />
          <Section title="Completed and cancelled" events={past} />
        </div>
      )}
    </Container>
  );
}
