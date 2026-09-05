"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Phone, WifiOff } from "lucide-react";
import { useEventActions, useRoster } from "@/components/hooks/useEvents";
import { useNow } from "@/components/hooks/useNow";
import AttendanceList from "@/components/roster/AttendanceList";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Dialog from "@/components/ui/Dialog";
import {
  Alert,
  EmptyState,
  PageHeader,
  Spinner,
} from "@/components/ui/Primitives";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { formatHours, formatLongDate } from "@/lib/dates";

export default function RosterPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const roster = useRoster(id);
  const { approveRoster } = useEventActions(id);
  const now = useNow();
  const [confirming, setConfirming] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (roster.isPending)
    return (
      <Container className="py-10">
        <Spinner />
      </Container>
    );
  if (roster.isError)
    return (
      <Container className="py-10">
        <EmptyState
          title="Roster unavailable"
          description={errorMessage(roster.error)}
        />
      </Container>
    );

  const r = roster.data;
  const locked = r.event.status !== "published";
  const confirmed = r.entries.filter((e) => e.signup.status === "confirmed");
  const unmarked = confirmed.filter((e) => !e.signup.attendance);
  const attended = confirmed.filter(
    (e) => e.signup.attendance?.status === "attended"
  );
  const totalHours = attended.reduce(
    (sum, e) => sum + (e.signup.attendance?.hours ?? 0),
    0
  );
  const started = r.shifts.some((s) => new Date(s.startsAt).getTime() <= now);

  return (
    <Container className="max-w-3xl py-6 sm:py-10">
      <PageHeader
        eyebrow="Attendance"
        title={r.event.title}
        description={`${formatLongDate(r.event.eventDate)} · ${confirmed.length} confirmed`}
        back={{ href: `/organizer/events/${id}`, label: "Manage event" }}
      />
      {offline ? (
        <Alert tone="warning" className="mb-4">
          <span className="inline-flex items-center gap-2">
            <WifiOff className="h-4 w-4" /> You are offline. Marks you make now
            are retried automatically when the signal returns.
          </span>
        </Alert>
      ) : null}
      {locked ? (
        <Alert tone="success" className="mb-4" title="Roster approved">
          Hours have been posted and certificates issued.
        </Alert>
      ) : null}
      {r.event.siteContactName ? (
        <p className="mb-4 inline-flex items-center gap-2 text-sm text-ink-600">
          <Phone className="h-4 w-4 text-brand-600" />
          {r.event.siteContactName}
          {r.event.siteContactPhone ? ` · ${r.event.siteContactPhone}` : ""}
        </p>
      ) : null}

      <AttendanceList roster={r} locked={locked} />

      {!locked ? (
        <Card className="mt-8 border-brand-200">
          <CardHeader
            title="Approve the roster"
            description="Posts hours to each volunteer's ledger, completes the event, issues certificates, and emails everyone. This cannot be undone; later corrections are made by an admin."
          />
          <CardBody className="grid gap-3">
            <p className="text-sm text-ink-700">
              {attended.length} attended ·{" "}
              {confirmed.length - attended.length - unmarked.length} no-shows ·{" "}
              {formatHours(totalHours)} to post
              {unmarked.length ? (
                <span className="block font-semibold text-amber-800">
                  {unmarked.length} still unmarked
                </span>
              ) : null}
            </p>
            <Button
              size="lg"
              icon={<CheckCircle2 className="h-5 w-5" />}
              disabled={unmarked.length > 0 || !started || offline}
              onClick={() => setConfirming(true)}
            >
              Approve roster
            </Button>
            {!started ? (
              <p className="text-[13px] text-ink-500">
                Approval opens once the first shift has started.
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Approve this roster?"
        description={`${formatHours(totalHours)} will be credited to ${attended.length} volunteers and the event marked completed.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Not yet
          </Button>
          <Button
            loading={approveRoster.isPending}
            onClick={async () => {
              try {
                const result = await approveRoster.mutateAsync();
                toast(
                  `Approved: ${formatHours(result.totalHours)} across ${result.approved} volunteers.`
                );
                router.push(`/organizer/events/${id}`);
              } catch (error) {
                toast(errorMessage(error), "error");
              } finally {
                setConfirming(false);
              }
            }}
          >
            Approve and finish
          </Button>
        </div>
      </Dialog>
    </Container>
  );
}
