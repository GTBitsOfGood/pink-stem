"use client";

import Link from "next/link";
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
import { EmptyState, PageHeader, Spinner } from "@/components/ui/Primitives";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { PENDING_REASON_LABELS } from "@/constants/labels";
import SignupHTTPClient from "@/http/signupHTTPClient";
import type { ClientSignupWithContext } from "@/http/userHTTPClient";
import { formatDate, formatHours, formatTimeRange } from "@/lib/dates";

function ShiftRow({
  item,
  onCancel,
  cancelling,
}: {
  item: ClientSignupWithContext;
  onCancel?: () => void;
  cancelling?: boolean;
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
          {onCancel ? (
            <Button
              size="sm"
              variant="danger"
              loading={cancelling}
              onClick={onCancel}
            >
              Cancel
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

  const now = useNow();
  const upcoming = (signups.data ?? []).filter(
    (s) =>
      new Date(s.shift.endsAt).getTime() >= now &&
      ["pending", "confirmed", "waitlisted"].includes(s.signup.status)
  );
  const past = (signups.data ?? [])
    .filter((s) => !upcoming.includes(s))
    .reverse();

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
                {upcoming.map((item) => (
                  <ShiftRow
                    key={item.signup._id}
                    item={item}
                    cancelling={
                      cancel.isPending &&
                      cancel.variables?.signupId === item.signup._id
                    }
                    onCancel={async () => {
                      if (
                        !window.confirm(
                          `Cancel your ${item.shift.roleName} shift at ${item.event.title}?`
                        )
                      )
                        return;
                      try {
                        await cancel.mutateAsync({ signupId: item.signup._id });
                        toast("Your sign-up was cancelled.");
                      } catch (error) {
                        toast(errorMessage(error), "error");
                      }
                    }}
                  />
                ))}
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
    </Container>
  );
}
