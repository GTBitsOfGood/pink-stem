"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  ClipboardCheck,
  Copy,
  Megaphone,
  Pencil,
  Send,
  XCircle,
} from "lucide-react";
import ShiftEditor from "@/components/events/ShiftEditor";
import UpdatesFeed from "@/components/events/UpdatesFeed";
import EventMeta from "@/components/events/EventMeta";
import {
  useEvent,
  useEventActions,
  useRoster,
} from "@/components/hooks/useEvents";
import { useNow } from "@/components/hooks/useNow";
import { useSignupActions } from "@/components/hooks/useSignups";
import Container from "@/components/layout/Container";
import Badge, { EventBadge, SignupBadge } from "@/components/ui/Badge";
import Button, { ButtonLink } from "@/components/ui/Button";
import Card, { CardBody, CardHeader, Stat } from "@/components/ui/Card";
import Dialog from "@/components/ui/Dialog";
import { Checkbox, Select, Textarea } from "@/components/ui/Field";
import {
  Alert,
  EmptyState,
  PageHeader,
  Spinner,
} from "@/components/ui/Primitives";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { PENDING_REASON_LABELS } from "@/constants/labels";
import type { ClientRoster } from "@/http/eventHTTPClient";
import { formatDateTime, formatHours } from "@/lib/dates";

type DialogKind = "cancel" | "update" | "broadcast" | null;

function PendingAndWaitlist({ roster }: { roster: ClientRoster }) {
  const toast = useToast();
  const { approve, promote } = useSignupActions(roster.event._id);
  const rows = roster.entries.filter(
    (e) => e.signup.status === "pending" || e.signup.status === "waitlisted"
  );
  if (!rows.length) return null;
  const act = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      toast(message);
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };
  return (
    <Card>
      <CardHeader
        title="Pending and waitlisted"
        description="Approve sign-ups you hold for review, or promote from the waitlist inside the auto-promotion window."
      />
      <ul className="divide-y divide-ink-100">
        {rows.map(({ signup, volunteer, cleared }) => {
          const shift = roster.shifts.find((s) => s._id === signup.shiftId);
          const needsApproval =
            signup.status === "pending" &&
            signup.pendingReasons.includes("approval");
          return (
            <li
              key={signup._id}
              className="flex flex-wrap items-center gap-3 px-5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">
                  {volunteer.firstName} {volunteer.lastName}{" "}
                  <span className="font-normal text-ink-500">
                    · {shift?.roleName}
                  </span>
                </p>
                <p className="text-[13px] text-ink-500">
                  {signup.status === "pending"
                    ? `Waiting on: ${signup.pendingReasons.map((r) => PENDING_REASON_LABELS[r].toLowerCase()).join("; ")}`
                    : `Waitlisted since ${formatDateTime(signup.signedUpAt)}`}
                </p>
              </div>
              <SignupBadge status={signup.status} />
              <Badge tone={cleared ? "success" : "warning"}>
                {cleared ? "Cleared" : "Not cleared"}
              </Badge>
              {needsApproval ? (
                <Button
                  size="sm"
                  onClick={() =>
                    act(() => approve.mutateAsync(signup._id), "Approved.")
                  }
                >
                  Approve
                </Button>
              ) : null}
              {signup.status === "waitlisted" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    act(
                      () => promote.mutateAsync(signup._id),
                      "Promoted from the waitlist."
                    )
                  }
                >
                  Promote
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default function ManageEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const event = useEvent(id);
  const roster = useRoster(id);
  const actions = useEventActions(id);
  const now = useNow();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [text, setText] = useState("");
  const [important, setImportant] = useState(false);
  const [rosterOnly, setRosterOnly] = useState(false);
  const [shiftId, setShiftId] = useState("");

  if (event.isPending)
    return (
      <Container className="py-10">
        <Spinner />
      </Container>
    );
  if (event.isError)
    return (
      <Container className="py-10">
        <EmptyState
          title="Event unavailable"
          description={errorMessage(event.error)}
        />
      </Container>
    );

  const e = event.data;
  const editable = e.status === "draft" || e.status === "published";
  const past = new Date(e.eventDate).getTime() < now;
  const entries = roster.data?.entries ?? [];
  const count = (status: string) =>
    entries.filter((x) => x.signup.status === status).length;
  const postedHours = entries.reduce(
    (sum, x) => sum + (x.signup.attendance?.hours ?? 0),
    0
  );

  const run = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      toast(message);
      setDialog(null);
      setText("");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };

  const submitDialog = (ev: FormEvent) => {
    ev.preventDefault();
    if (dialog === "cancel")
      run(
        () => actions.cancel.mutateAsync(text),
        "Event cancelled. Everyone signed up has been emailed."
      );
    if (dialog === "update")
      run(
        () =>
          actions.postUpdate.mutateAsync({
            kind: important ? "important" : "note",
            body: text,
            rosterOnly,
          }),
        important
          ? "Important change posted and emailed."
          : "Note posted. It goes out in the next daily digest."
      );
    if (dialog === "broadcast")
      run(async () => {
        const r = await actions.broadcast.mutateAsync({
          body: text,
          shiftId: shiftId || undefined,
        });
        toast(`Sent to ${r.sent} volunteers.`);
      }, "Messages sent.");
  };

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        eyebrow="Manage event"
        title={e.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EventBadge status={e.status} />
            <Link
              href={`/events/${e._id}`}
              className="font-semibold text-brand-700 hover:underline"
            >
              View public page
            </Link>
          </span>
        }
        back={{ href: "/organizer", label: "Your events" }}
        action={
          <>
            {editable ? (
              <ButtonLink
                href={`/organizer/events/${e._id}/edit`}
                variant="secondary"
                icon={<Pencil className="h-4 w-4" />}
              >
                Edit details
              </ButtonLink>
            ) : null}
            <Button
              variant="secondary"
              icon={<Copy className="h-4 w-4" />}
              loading={actions.duplicate.isPending}
              onClick={() =>
                run(async () => {
                  const copy = await actions.duplicate.mutateAsync();
                  router.push(`/organizer/events/${copy._id}`);
                }, "Duplicated as a new draft.")
              }
            >
              Duplicate
            </Button>
            {e.status === "draft" ? (
              <Button
                icon={<Send className="h-4 w-4" />}
                loading={actions.publish.isPending}
                onClick={() =>
                  run(
                    () => actions.publish.mutateAsync(),
                    "Published. Volunteers can now sign up."
                  )
                }
              >
                Publish
              </Button>
            ) : null}
            {e.status === "published" || e.status === "completed" ? (
              <ButtonLink
                href={`/organizer/events/${e._id}/roster`}
                variant={e.status === "completed" ? "secondary" : "primary"}
                icon={<ClipboardCheck className="h-4 w-4" />}
              >
                {e.status === "completed"
                  ? "View roster"
                  : past
                    ? "Mark attendance & approve"
                    : "Roster"}
              </ButtonLink>
            ) : null}
          </>
        }
      />

      {e.status === "draft" ? (
        <Alert tone="info" className="mb-6">
          Drafts are invisible to volunteers and send no notifications. Add at
          least one shift, then publish.
        </Alert>
      ) : null}
      {e.status === "published" && past ? (
        <Alert tone="warning" className="mb-6" title="This event has happened">
          Mark who attended and approve the roster. Hours and certificates go
          out the moment you do.
        </Alert>
      ) : null}
      {e.status === "cancelled" ? (
        <Alert tone="danger" className="mb-6" title="Cancelled">
          {e.cancellationReason}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-6">
          {e.status === "completed" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Attended" value={count("attended")} tone="brand" />
              <Stat label="No-shows" value={count("no_show")} />
              <Stat label="Hours posted" value={formatHours(postedHours)} />
            </div>
          ) : e.status !== "draft" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Confirmed" value={count("confirmed")} tone="brand" />
              <Stat label="Pending" value={count("pending")} />
              <Stat label="Waitlisted" value={count("waitlisted")} />
            </div>
          ) : null}

          <Card>
            <CardHeader
              title="Shifts"
              description="Capacity is enforced at the database, so a shift can never be over-filled."
            />
            <CardBody>
              <ShiftEditor
                shifts={e.shifts}
                eventDate={e.eventDate}
                editable={editable}
                onAdd={(body) => actions.addShift.mutateAsync(body)}
                onUpdate={(shiftId, body) =>
                  actions.updateShift.mutateAsync({ shiftId, body })
                }
                onDelete={(shiftId) => actions.deleteShift.mutateAsync(shiftId)}
              />
            </CardBody>
          </Card>

          {roster.data ? <PendingAndWaitlist roster={roster.data} /> : null}

          <Card>
            <CardHeader
              title="Updates"
              description="Notes go out in a daily digest. Important changes email every confirmed and waitlisted volunteer immediately and pin to the top."
              action={
                editable ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Megaphone className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setImportant(false);
                      setRosterOnly(false);
                      setDialog("update");
                    }}
                  >
                    Post an update
                  </Button>
                ) : null
              }
            />
            <CardBody>
              <UpdatesFeed
                updates={e.updates}
                canManage={editable}
                onEdit={(updateId, body) =>
                  actions.editUpdate
                    .mutateAsync({ updateId, body })
                    .catch((error) => toast(errorMessage(error), "error"))
                }
                onDelete={(updateId) =>
                  actions.deleteUpdate
                    .mutateAsync(updateId)
                    .catch((error) => toast(errorMessage(error), "error"))
                }
              />
            </CardBody>
          </Card>
        </div>

        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="grid gap-3">
              <EventMeta event={e} />
              <p className="text-[13px] text-ink-500">
                Organizer: {e.organizerName}
              </p>
            </CardBody>
          </Card>
          {e.status === "published" ? (
            <Card>
              <CardHeader
                title="Message the roster"
                description="Lands as individual conversations so replies come back one to one."
              />
              <CardBody className="grid gap-2">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setDialog("broadcast")}
                >
                  Write a message
                </Button>
                <Link
                  href={`/messages?eventId=${e._id}`}
                  className="text-center text-[13px] font-semibold text-brand-700 hover:underline"
                >
                  Conversations about this event
                </Link>
              </CardBody>
            </Card>
          ) : null}
          {editable ? (
            <Card>
              <CardHeader
                title="Cancel this event"
                description="Requires a reason. Everyone signed up is released and emailed it."
              />
              <CardBody>
                <Button
                  variant="danger"
                  className="w-full"
                  icon={<XCircle className="h-4 w-4" />}
                  onClick={() => setDialog("cancel")}
                >
                  Cancel event
                </Button>
              </CardBody>
            </Card>
          ) : null}
        </aside>
      </div>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={
          dialog === "cancel"
            ? "Cancel this event"
            : dialog === "update"
              ? "Post an update"
              : "Message the whole roster"
        }
        description={
          dialog === "cancel"
            ? "Your reason is posted as a pinned update and emailed to every volunteer signed up. No hours are credited."
            : dialog === "update"
              ? "Newest updates appear at the top of the event page and in every volunteer's My shifts view."
              : "Each confirmed, pending, and waitlisted volunteer receives this as a private message from you."
        }
      >
        <form onSubmit={submitDialog} className="grid gap-4">
          {dialog === "broadcast" ? (
            <Select
              label="Send to"
              options={[
                { value: "", label: "Everyone on the roster" },
                ...e.shifts.map((s) => ({
                  value: s._id,
                  label: `${s.roleName} shift only`,
                })),
              ]}
              value={shiftId}
              onChange={(ev) => setShiftId(ev.target.value)}
            />
          ) : null}
          <Textarea
            label={dialog === "cancel" ? "Reason" : "Message"}
            required
            rows={5}
            value={text}
            onChange={(ev) => setText(ev.target.value)}
          />
          {dialog === "update" ? (
            <div className="grid gap-2">
              <Checkbox
                label="Important change"
                description="Time, location, weather, staffing risk. Emails immediately and pins until the event completes. Cannot be deleted once emailed."
                checked={important}
                onChange={(ev) => setImportant(ev.target.checked)}
              />
              <Checkbox
                label="Roster only"
                description="Hidden from signed-out visitors and anyone who cancelled. Use for door codes or a contact's mobile number."
                checked={rosterOnly}
                onChange={(ev) => setRosterOnly(ev.target.checked)}
              />
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialog(null)}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant={dialog === "cancel" ? "danger" : "primary"}
              loading={
                actions.cancel.isPending ||
                actions.postUpdate.isPending ||
                actions.broadcast.isPending
              }
            >
              {dialog === "cancel"
                ? "Cancel event"
                : dialog === "update"
                  ? "Post"
                  : "Send"}
            </Button>
          </div>
        </form>
      </Dialog>
    </Container>
  );
}
