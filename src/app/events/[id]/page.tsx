"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, MessageSquare, Settings2 } from "lucide-react";
import EventMeta from "@/components/events/EventMeta";
import ShiftList from "@/components/events/ShiftList";
import UpdatesFeed from "@/components/events/UpdatesFeed";
import { useEvent } from "@/components/hooks/useEvents";
import { useMessageActions } from "@/components/hooks/useMessages";
import { useNow } from "@/components/hooks/useNow";
import { useSession } from "@/components/hooks/useSession";
import Container from "@/components/layout/Container";
import Badge, { EventBadge } from "@/components/ui/Badge";
import Button, { ButtonLink } from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Dialog from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Field";
import { Alert, EmptyState, Spinner } from "@/components/ui/Primitives";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { PROGRAM_AREA_LABELS, REGION_LABELS } from "@/constants/labels";
import { IMPORTANT_UPDATE_BANNER_HOURS } from "@/constants/limits";

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const event = useEvent(id);
  const { user } = useSession();
  const toast = useToast();
  const router = useRouter();
  const { createThread } = useMessageActions();
  const now = useNow();
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("");

  if (event.isPending)
    return (
      <Container className="py-10">
        <Spinner label="Loading event" />
      </Container>
    );
  if (event.isError)
    return (
      <Container className="py-10">
        <EmptyState
          title="Event not found"
          description={errorMessage(event.error)}
          action={
            <ButtonLink href="/events" variant="secondary">
              Browse events
            </ButtonLink>
          }
        />
      </Container>
    );

  const e = event.data;
  const onRoster = e.mySignups.some((s) =>
    ["pending", "confirmed", "waitlisted"].includes(s.status)
  );
  const pinned = e.updates.find((u) => u.kind === "important" && u.pinned);
  const hoursToStart = (new Date(e.eventDate).getTime() - now) / 3_600_000;
  const showBanner =
    pinned &&
    hoursToStart < IMPORTANT_UPDATE_BANNER_HOURS &&
    e.status === "published";

  return (
    <Container className="py-8 sm:py-10">
      {showBanner ? (
        <Alert
          tone="warning"
          className="mb-6"
          title="Important change posted for this event"
        >
          <span className="whitespace-pre-wrap">{pinned.body}</span>
        </Alert>
      ) : null}
      {e.status === "cancelled" ? (
        <Alert tone="danger" className="mb-6" title="This event was cancelled">
          {e.cancellationReason}
        </Alert>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{PROGRAM_AREA_LABELS[e.programArea]}</Badge>
            <Badge>{e.isVirtual ? "Virtual" : REGION_LABELS[e.region]}</Badge>
            {e.status !== "published" ? <EventBadge status={e.status} /> : null}
            {e.requiresApproval ? (
              <Badge tone="info">Organizer approves sign-ups</Badge>
            ) : null}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            {e.title}
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Organized by {e.organizerName}
          </p>
          {e.coverImageUrl ? (
            <div className="relative mt-5 aspect-[2/1] overflow-hidden rounded-2xl border border-ink-200 bg-ink-100">
              <Image
                src={e.coverImageUrl}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : null}
          <div className="mt-6 whitespace-pre-wrap text-[15px] leading-7 text-ink-700">
            {e.description}
          </div>

          <section className="mt-10">
            <h2 className="mb-1 text-xl font-bold text-ink-900">Shifts</h2>
            <p className="mb-4 text-sm text-ink-500">
              Sign up for the block of time you can cover. You only commit to
              the shift, not the whole day.
            </p>
            {e.shifts.length ? (
              <ShiftList event={e} />
            ) : (
              <EmptyState title="No shifts posted yet" />
            )}
          </section>

          <section className="mt-10">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-xl font-bold text-ink-900">
                Updates from the organizer
              </h2>
              {pinned ? (
                <AlertTriangle
                  className="h-5 w-5 text-amber-600"
                  aria-label="Pinned important change"
                />
              ) : null}
            </div>
            <UpdatesFeed updates={e.updates} />
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <EventMeta event={e} />
            </CardBody>
          </Card>
          {e.canManage ? (
            <ButtonLink
              href={`/organizer/events/${e._id}`}
              variant="secondary"
              icon={<Settings2 className="h-4 w-4" />}
            >
              Manage this event
            </ButtonLink>
          ) : null}
          {user && onRoster ? (
            <Card>
              <CardHeader
                title="Questions?"
                description="Message the organizer. Conversations stay attached to this event and are visible to Pink STEM administrators."
              />
              <CardBody>
                <Button
                  variant="secondary"
                  className="w-full"
                  icon={<MessageSquare className="h-4 w-4" />}
                  onClick={() => setComposing(true)}
                >
                  Message the organizer
                </Button>
              </CardBody>
            </Card>
          ) : null}
          {!user ? (
            <Card>
              <CardBody className="text-sm text-ink-600">
                <p className="font-semibold text-ink-900">New to Pink STEM?</p>
                <p className="mt-1">
                  Create a volunteer account to claim a shift. It takes about a
                  minute.
                </p>
                <Link
                  href={`/register?next=/events/${e._id}`}
                  className="mt-3 inline-block font-semibold text-brand-700 hover:underline"
                >
                  Become a volunteer →
                </Link>
              </CardBody>
            </Card>
          ) : null}
        </aside>
      </div>

      <Dialog
        open={composing}
        onClose={() => setComposing(false)}
        title={`Message ${e.organizerName}`}
        description="Both of you are told that Pink STEM administrators can read this conversation."
      >
        <form
          className="grid gap-3"
          onSubmit={async (ev) => {
            ev.preventDefault();
            try {
              const result = await createThread.mutateAsync({
                eventId: e._id,
                body,
              });
              setComposing(false);
              setBody("");
              router.push(`/messages/${result.thread._id}`);
            } catch (error) {
              toast(errorMessage(error), "error");
            }
          }}
        >
          <Textarea
            label="Your message"
            required
            rows={5}
            value={body}
            onChange={(ev) => setBody(ev.target.value)}
            placeholder="Ask about parking, what to bring, or anything about your shift."
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setComposing(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createThread.isPending}>
              Send
            </Button>
          </div>
        </form>
      </Dialog>
    </Container>
  );
}
