"use client";

import { useParams, useRouter } from "next/navigation";
import EventForm from "@/components/events/EventForm";
import { useEvent, useEventActions } from "@/components/hooks/useEvents";
import Container from "@/components/layout/Container";
import { Alert, PageHeader, Spinner } from "@/components/ui/Primitives";
import { errorMessage, useToast } from "@/components/ui/Toast";
import type { EventBody, SeriesUpdateBody } from "@/http/eventHTTPClient";

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const event = useEvent(id);
  const { update, updateSeries } = useEventActions(id);
  const editingSeries =
    event.data?.commitment === "long_term" && !!event.data.seriesId;

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <PageHeader
        eyebrow={editingSeries ? "Edit program" : "Edit event"}
        title={event.data?.title ?? "Edit event"}
        back={{ href: `/organizer/events/${id}`, label: "Manage event" }}
      />
      {editingSeries ? (
        <Alert tone="info" className="mb-6">
          Changes apply to sessions that have not started. Moving the last date
          earlier cancels later sessions and emails anyone signed up.
        </Alert>
      ) : event.data?.status === "published" ? (
        <Alert tone="info" className="mb-6">
          This event is live. If the date, time, or location changes, post an
          important update afterwards so everyone signed up is emailed.
        </Alert>
      ) : null}
      {event.isPending ? (
        <Spinner />
      ) : event.data && editingSeries ? (
        <EventForm
          initial={event.data}
          editSeries
          submitLabel="Save program changes"
          pending={updateSeries.isPending}
          onSubmit={async (body: SeriesUpdateBody) => {
            try {
              await updateSeries.mutateAsync(body);
              toast("Upcoming program sessions updated.");
              router.push(`/organizer/events/${id}`);
            } catch (error) {
              toast(errorMessage(error), "error");
            }
          }}
        />
      ) : event.data ? (
        <EventForm
          initial={event.data}
          submitLabel="Save changes"
          pending={update.isPending}
          onSubmit={async (body: EventBody) => {
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
