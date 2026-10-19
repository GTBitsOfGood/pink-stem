"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { CalendarPlus, Info } from "lucide-react";
import {
  useMyHours,
  useMySignups,
  useSignupActions,
} from "@/components/hooks/useSignups";
import { useNow } from "@/components/hooks/useNow";
import { useSession } from "@/components/hooks/useSession";
import Container from "@/components/layout/Container";
import OutstandingList from "@/components/profile/OutstandingList";
import { SignupBadge } from "@/components/ui/Badge";
import Button, { ButtonLink } from "@/components/ui/Button";
import Card, { CardBody, CardHeader, Stat } from "@/components/ui/Card";
import Dialog from "@/components/ui/Dialog";
import { Select, Textarea } from "@/components/ui/Field";
import { EmptyState, PageHeader, Spinner } from "@/components/ui/Primitives";
import { errorMessage, useToast } from "@/components/ui/Toast";
import {
  ABSENCE_REASON_LABELS,
  PENDING_REASON_LABELS,
} from "@/constants/labels";
import { MAX_ABSENCE_NOTE_LENGTH } from "@/constants/limits";
import SignupHTTPClient from "@/http/signupHTTPClient";
import type { ClientSignupWithContext } from "@/http/userHTTPClient";
import { formatDate, formatHours, formatTimeRange } from "@/lib/dates";
import { ABSENCE_REASONS, type AbsenceReason } from "@/types/signup";

function ShiftRow({
  item,
  onCancel,
  cancelling,
  onReportAbsence,
}: {
  item: ClientSignupWithContext;
  onCancel?: () => void;
  cancelling?: boolean;
  onReportAbsence?: () => void;
}) {
  const { signup, shift, event } = item;
  const live = ["pending", "confirmed", "waitlisted"].includes(signup.status);
  return (
    <li className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/events/${event._id}`}
            className="text-base font-bold text-ink-900 hover:text-brand-800"
          >
            {event.title}
          </Link>
          <SignupBadge status={signup.status} />
        </div>
        <p className="mt-0.5 text-sm text-ink-600">
          {shift.roleName} · {formatDate(shift.startsAt)} ·{" "}
          {formatTimeRange(shift.startsAt, shift.endsAt)}
        </p>
        <p className="text-[13px] text-ink-500">
          {event.isVirtual
            ? "Virtual"
            : [event.locationName, event.address].filter(Boolean).join(", ")}
        </p>
        {signup.status === "pending" && signup.pendingReasons.length ? (
          <p className="mt-1 text-[13px] text-amber-800">
            Waiting on:{" "}
            {signup.pendingReasons
              .map((r) => PENDING_REASON_LABELS[r].toLowerCase())
              .join("; ")}
          </p>
        ) : null}
        {signup.attendance && !live ? (
          <p className="mt-1 text-[13px] text-ink-500">
            {signup.attendance.status === "attended"
              ? `${formatHours(signup.attendance.hours)} approved`
              : "Marked as no-show"}
          </p>
        ) : null}
      </div>
      {live ? (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Link
            href={`/events/${event._id}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-[13px] font-semibold text-ink-700 hover:bg-ink-50"
          >
            <Info className="h-3.5 w-3.5" /> Details
          </Link>
          {signup.status === "confirmed" ? (
            <a
              href={SignupHTTPClient.calendarUrl(signup._id)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-[13px] font-semibold text-ink-700 hover:bg-ink-50"
            >
              <CalendarPlus className="h-3.5 w-3.5" /> Calendar
            </a>
          ) : null}
          {onReportAbsence ? (
            <Button size="sm" variant="danger" onClick={onReportAbsence}>
              Can&apos;t make it
            </Button>
          ) : onCancel ? (
            <Button
              size="sm"
              variant="danger"
              loading={cancelling}
              onClick={onCancel}
            >
              Leave waitlist
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export default function DashboardPage() {
  const { user } = useSession();
  const signups = useMySignups();
  const hours = useMyHours();
  const { cancel } = useSignupActions();
  const toast = useToast();
  const [reporting, setReporting] = useState<ClientSignupWithContext | null>(
    null
  );

  const now = useNow();
  const upcoming = (signups.data ?? []).filter(
    (s) =>
      new Date(s.shift.endsAt).getTime() >= now &&
      ["pending", "confirmed", "waitlisted"].includes(s.signup.status)
  );
  const past = (signups.data ?? [])
    .filter((s) => !upcoming.includes(s))
    .reverse();

  const leaveWaitlist = async ({
    signup,
    shift,
    event,
  }: ClientSignupWithContext) => {
    if (
      !window.confirm(
        `Leave the waitlist for the ${shift.roleName} shift at ${event.title}?`
      )
    )
      return;
    try {
      await cancel.mutateAsync({ signupId: signup._id });
      toast("You left the waitlist.");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        eyebrow="My shifts"
        title={user ? `Hi ${user.firstName}` : "My shifts"}
        description="Everything you have signed up for, what is still outstanding, and your hours to date."
        action={
          <ButtonLink href="/events" variant="secondary">
            Find another shift
          </ButtonLink>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader
              title="Upcoming"
              description={`${upcoming.length} ${upcoming.length === 1 ? "shift" : "shifts"}`}
            />
            {signups.isPending ? (
              <Spinner />
            ) : upcoming.length ? (
              <ul className="divide-y divide-ink-100">
                {upcoming.map((item) => {
                  // Until the shift starts, a held spot can be given up and
                  // a waitlist place left.
                  const open = new Date(item.shift.startsAt).getTime() > now;
                  const waitlisted = item.signup.status === "waitlisted";
                  return (
                    <ShiftRow
                      key={item.signup._id}
                      item={item}
                      onReportAbsence={
                        open && !waitlisted
                          ? () => setReporting(item)
                          : undefined
                      }
                      cancelling={
                        cancel.isPending &&
                        cancel.variables?.signupId === item.signup._id
                      }
                      onCancel={
                        open && waitlisted
                          ? () => leaveWaitlist(item)
                          : undefined
                      }
                    />
                  );
                })}
              </ul>
            ) : (
              <CardBody>
                <EmptyState
                  title="Nothing scheduled"
                  description="Browse upcoming events and claim a shift that fits."
                  action={<ButtonLink href="/events">Find a shift</ButtonLink>}
                />
              </CardBody>
            )}
          </Card>
          <Card>
            <CardHeader title="Past" />
            {past.length ? (
              <ul className="divide-y divide-ink-100">
                {past.map((item) => (
                  <ShiftRow key={item.signup._id} item={item} />
                ))}
              </ul>
            ) : (
              <CardBody className="text-sm text-ink-500">
                No past shifts yet.
              </CardBody>
            )}
          </Card>
        </div>
        <div className="grid content-start gap-4">
          <Stat
            label="Approved hours to date"
            value={hours.data ? formatHours(hours.data.total) : "—"}
            hint={
              hours.data
                ? `${hours.data.certificates.filter((c) => !c.revokedAt).length} active certificates`
                : undefined
            }
            tone="brand"
          />
          <OutstandingList />
          <Card>
            <CardBody className="text-sm text-ink-600">
              <p className="font-semibold text-ink-900">
                Need a letter for school?
              </p>
              <p className="mt-1">
                Request a service record covering any date range. It lists every
                event, carries a signature, and verifies online.
              </p>
              <Link
                href="/hours"
                className="mt-2 inline-block font-semibold text-brand-700 hover:underline"
              >
                Go to Hours &amp; certificates →
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
      {reporting ? (
        <AbsenceDialog item={reporting} onClose={() => setReporting(null)} />
      ) : null}
    </Container>
  );
}

function AbsenceDialog({
  item,
  onClose,
}: {
  item: ClientSignupWithContext;
  onClose: () => void;
}) {
  const { reportAbsence } = useSignupActions();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const { signup, shift, event } = item;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await reportAbsence.mutateAsync({
        signupId: signup._id,
        body: { reason: reason as AbsenceReason, note },
      });
      toast("Your absence has been reported. The organizer has been notified.");
      onClose();
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Report an absence"
      description={`${event.title} · ${shift.roleName} · ${formatDate(shift.startsAt)} · ${formatTimeRange(shift.startsAt, shift.endsAt)}. Your spot goes to the next person and the organizer is emailed right away.`}
    >
      <form onSubmit={submit} className="grid gap-4">
        <Select
          label="Reason"
          required
          placeholder="Choose a reason"
          options={ABSENCE_REASONS.map((r) => ({
            value: r,
            label: ABSENCE_REASON_LABELS[r],
          }))}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Textarea
          label="Note for the organizer"
          hint="Optional."
          rows={3}
          maxLength={MAX_ABSENCE_NOTE_LENGTH}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Back
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={reportAbsence.isPending}
          >
            Report absence
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
