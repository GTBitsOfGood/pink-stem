"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { useSession } from "@/components/hooks/useSession";
import { ClearanceBadge } from "@/components/ui/Badge";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import { PENDING_REASON_LABELS } from "@/constants/labels";
import ResendVerificationButton from "@/components/profile/ResendVerificationButton";

/** The account-level checklist that keeps sign-ups pending, with a fix for each item. */
export default function OutstandingList() {
  const { me } = useSession();

  if (!me) return null;
  const items = me.outstanding;
  const clearance = me.clearance?.status ?? "none";

  return (
    <Card className={items.length ? "border-amber-300" : undefined}>
      <CardHeader
        eyebrow="Before you are confirmed"
        title={
          items.length
            ? "A few things are outstanding"
            : "Your account is ready"
        }
        description={
          items.length
            ? "Sign-ups stay pending until these are done."
            : "Sign-ups confirm automatically, subject to each event's clearance rules."
        }
      />
      <CardBody className="grid gap-3">
        {items.map((reason) => (
          <div
            key={reason}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
          >
            <span className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4 shrink-0 text-amber-600" />
              {PENDING_REASON_LABELS[reason]}
            </span>
            {reason === "email_verification" ? (
              <ResendVerificationButton />
            ) : null}
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink-50 px-3 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-ink-700">
            Background clearance <ClearanceBadge status={clearance} />
          </span>
          <span className="text-[13px] text-ink-500">
            {clearance === "cleared" ? (
              "Required for most events with students."
            ) : (
              <>
                Recorded by Pink STEM staff after screening.{" "}
                <Link
                  href="/profile"
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Details
                </Link>
              </>
            )}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
