"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { useProfile } from "@/components/hooks/useProfile";
import { useSession } from "@/components/hooks/useSession";
import { useSignupActions } from "@/components/hooks/useSignups";
import WaiverDialog from "@/components/profile/WaiverDialog";
import { SignupBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { PENDING_REASON_LABELS, SKILL_LABELS } from "@/constants/labels";
import type {
  ClientEventDetail,
  ClientShift,
  ClientSignup,
} from "@/http/eventHTTPClient";
import SignupHTTPClient from "@/http/signupHTTPClient";
import { formatHours, formatTimeRange, hoursBetween } from "@/lib/dates";
import { HTTPError } from "@/types/exceptions";

/** Shifts with one-tap sign-up. Handles sign-in, the waiver, and overlap confirmation in place. */
export default function ShiftList({ event }: { event: ClientEventDetail }) {
  const router = useRouter();
  const toast = useToast();
  const { me, user } = useSession();
  const { acceptWaiver } = useProfile();
  const { signUp, cancel } = useSignupActions(event._id);
  const [waiverFor, setWaiverFor] = useState<string | null>(null);
  const [overlapFor, setOverlapFor] = useState<string | null>(null);
  const open = event.status === "published";
  const signupFor = (shiftId: string) =>
    event.mySignups.find((s) => s.shiftId === shiftId);

  const attempt = async (shiftId: string, acknowledgeOverlap = false) => {
    if (!user) {
      router.push(`/login?next=/events/${event._id}`);
      return;
    }
    if (me && me.outstanding.includes("waiver")) {
      setWaiverFor(shiftId);
      return;
    }
    try {
      const signup = await signUp.mutateAsync({ shiftId, acknowledgeOverlap });
      toast(
        signup.status === "confirmed"
          ? "You are confirmed. Check your email for the details."
          : signup.status === "waitlisted"
            ? "The shift is full, so you are on the waitlist."
            : "Spot held. A few things are still outstanding before it is confirmed."
      );
    } catch (error) {
      if (error instanceof HTTPError && error.code === "overlap")
        setOverlapFor(shiftId);
      else toast(errorMessage(error), "error");
    }
  };

  const shiftRow = (shift: ClientShift, mine?: ClientSignup) => {
    const openSpots = Math.max(0, shift.capacity - shift.filledCount);
    const past = new Date(shift.startsAt) < new Date();
    return (
      <li
        key={shift._id}
        className="grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-ink-900">{shift.roleName}</p>
            {mine ? <SignupBadge status={mine.status} /> : null}
          </div>
          <p className="mt-0.5 text-sm text-ink-600">
            {formatTimeRange(shift.startsAt, shift.endsAt)} ·{" "}
            {formatHours(hoursBetween(shift.startsAt, shift.endsAt))}
          </p>
          {shift.description ? (
            <p className="mt-1.5 text-sm text-ink-600">{shift.description}</p>
          ) : null}
          {shift.requiredSkills.length ? (
            <p className="mt-1.5 text-[13px] text-ink-500">
              Helpful skills:{" "}
              {shift.requiredSkills.map((s) => SKILL_LABELS[s]).join(", ")}
            </p>
          ) : null}
          <p className="mt-1.5 text-[13px] font-semibold text-ink-500">
            {openSpots > 0
              ? `${openSpots} of ${shift.capacity} spots open`
              : `Full · ${shift.waitlistCount} on the waitlist`}
          </p>
          {mine?.status === "pending" && mine.pendingReasons.length ? (
            <ul className="mt-2 grid gap-1 rounded-xl bg-amber-50 p-3 text-[13px] text-amber-900">
              <li className="font-semibold">
                Still outstanding before you are confirmed:
              </li>
              {mine.pendingReasons.map((r) => (
                <li key={r}>• {PENDING_REASON_LABELS[r]}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {mine &&
          ["pending", "confirmed", "waitlisted"].includes(mine.status) ? (
            <>
              {mine.status === "confirmed" ? (
                <a
                  href={SignupHTTPClient.calendarUrl(mine._id)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                >
                  <CalendarPlus className="h-4 w-4" /> Add to calendar
                </a>
              ) : null}
              <Button
                variant="danger"
                loading={cancel.isPending}
                onClick={async () => {
                  try {
                    await cancel.mutateAsync({ signupId: mine._id });
                    toast("Your sign-up was cancelled.");
                  } catch (error) {
                    toast(errorMessage(error), "error");
                  }
                }}
              >
                Cancel sign-up
              </Button>
            </>
          ) : open && !past ? (
            <Button
              loading={
                signUp.isPending && signUp.variables?.shiftId === shift._id
              }
              onClick={() => attempt(shift._id)}
            >
              {openSpots > 0 ? "Sign up" : "Join waitlist"}
            </Button>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <>
      <ul className="grid gap-3">
        {event.shifts.map((shift) => shiftRow(shift, signupFor(shift._id)))}
      </ul>

      <WaiverDialog
        open={!!waiverFor}
        onClose={() => setWaiverFor(null)}
        onAccept={async () => {
          await acceptWaiver.mutateAsync();
          const shiftId = waiverFor;
          setWaiverFor(null);
          if (shiftId) await attempt(shiftId);
        }}
      />

      <Dialog
        open={!!overlapFor}
        onClose={() => setOverlapFor(null)}
        title="This shift overlaps one you already hold"
        description="You can still sign up, for example to cover two adjacent roles. Just make sure you can be in both places."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOverlapFor(null)}>
            Go back
          </Button>
          <Button
            onClick={async () => {
              const shiftId = overlapFor;
              setOverlapFor(null);
              if (shiftId) await attempt(shiftId, true);
            }}
          >
            Sign up anyway
          </Button>
        </div>
      </Dialog>
    </>
  );
}
