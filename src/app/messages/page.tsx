"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useEvent } from "@/components/hooks/useEvents";
import { useThreads } from "@/components/hooks/useMessages";
import { useSession } from "@/components/hooks/useSession";
import ThreadList from "@/components/messages/ThreadList";
import Container from "@/components/layout/Container";
import {
  Alert,
  PageHeader,
  Pagination,
  Spinner,
} from "@/components/ui/Primitives";

/** Every conversation the viewer is party to, or those about one event when `eventId` is set. */
function Conversations() {
  const { user } = useSession();
  const eventId = useSearchParams().get("eventId") ?? undefined;
  const event = useEvent(eventId ?? "");
  const [page, setPage] = useState(1);
  const threads = useThreads({ page: String(page), eventId });
  const staff = user?.role === "organizer" || user?.role === "admin";

  return (
    <Container className="max-w-4xl py-8 sm:py-10">
      <PageHeader
        eyebrow="Messages"
        title={eventId ? "Conversations about this event" : "Conversations"}
        description={
          eventId
            ? "Each volunteer on the roster gets their own thread, so replies come back one to one."
            : "Every conversation is attached to an event. Organizers answer questions here so the record stays in one place."
        }
        back={
          eventId
            ? {
                href: `/organizer/events/${eventId}`,
                label: event.data?.title ?? "Event",
              }
            : undefined
        }
      />
      <Alert tone="info" className="mb-4">
        Messages are visible to Pink STEM administrators. Volunteers never
        message each other through the hub.
      </Alert>
      {threads.isPending || !user ? (
        <Spinner />
      ) : (
        <>
          <ThreadList
            threads={threads.data?.items ?? []}
            currentUserId={user._id}
            emptyText={
              staff && eventId
                ? "Nobody has written about this event yet. Use “Write a message” on the event page to reach the roster."
                : "Open an event you are signed up for and use “Message the organizer” to start one."
            }
          />
          {threads.data ? (
            <Pagination
              page={threads.data.page}
              total={threads.data.total}
              pageSize={threads.data.pageSize}
              onPage={setPage}
            />
          ) : null}
        </>
      )}
    </Container>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <Conversations />
    </Suspense>
  );
}
