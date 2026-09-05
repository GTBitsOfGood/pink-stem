"use client";

import { useRouter } from "next/navigation";
import EventForm from "@/components/events/EventForm";
import { useEventActions } from "@/components/hooks/useEvents";
import Container from "@/components/layout/Container";
import { PageHeader } from "@/components/ui/Primitives";
import { errorMessage, useToast } from "@/components/ui/Toast";

export default function NewEventPage() {
  const router = useRouter();
  const toast = useToast();
  const { create } = useEventActions();

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <PageHeader
        eyebrow="New event"
        title="Create an event"
        description="Events start as drafts. Add shifts next, then publish when volunteers should see it."
        back={{ href: "/organizer", label: "Your events" }}
      />
      <EventForm
        submitLabel="Save draft and add shifts"
        pending={create.isPending}
        onSubmit={async (body) => {
          try {
            const event = await create.mutateAsync(body);
            router.push(`/organizer/events/${event._id}`);
          } catch (error) {
            toast(errorMessage(error), "error");
          }
        }}
      />
    </Container>
  );
}
