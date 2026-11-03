"use client";

import { useParams, useRouter } from "next/navigation";
import EventForm from "@/components/events/EventForm";
import { useEvent, useEventActions } from "@/components/hooks/useEvents";
import Container from "@/components/layout/Container";
import { Alert, PageHeader, Spinner } from "@/components/ui/Primitives";
import { errorMessage, useToast } from "@/components/ui/Toast";

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const event = useEvent(id);
  const { update } = useEventActions(id);

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <PageHeader
        eyebrow="Edit event"
        title={event.data?.title ?? "Edit event"}
        back={{ href: `/organizer/events/${id}`, label: "Manage event" }}
      />
      {event.data?.status === "published" ? (
        <Alert tone="info" className="mb-6">
          This event is live. If the date, time, or location changes, post an
          important update afterwards so everyone signed up is emailed.
        </Alert>
      ) : null}
      {event.isPending ? (
        <Spinner />
      ) : event.data ? (
        <EventForm
          initial={event.data}
          submitLabel="Save changes"
          pending={update.isPending}
          onSubmit={async (body) => {
            try {
              await update.mutateAsync(body);
              toast("Event saved.");
              router.push(`/organizer/events/${id}`);
            } catch (error) {
              toast(errorMessage(error), "error");
            }
          }}
        />
      ) : null}
    </Container>
  );
}
