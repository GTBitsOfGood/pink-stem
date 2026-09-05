import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ClearanceStatus } from "@/types/user";
import type { EventStatus } from "@/types/event";
import type { SignupStatus } from "@/types/signup";
import {
  CLEARANCE_LABELS,
  EVENT_STATUS_LABELS,
  SIGNUP_STATUS_LABELS,
} from "@/constants/labels";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const TONE: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-brand-100 text-brand-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-800",
  info: "bg-sky-100 text-sky-800",
};

/** Status is always spelled out; color only reinforces the label. */
export default function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5",
        TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const SIGNUP_TONE: Record<SignupStatus, Tone> = {
  pending: "warning",
  confirmed: "success",
  waitlisted: "info",
  cancelled: "neutral",
  attended: "success",
  no_show: "danger",
};

export function SignupBadge({ status }: { status: SignupStatus }) {
  return (
    <Badge tone={SIGNUP_TONE[status]}>{SIGNUP_STATUS_LABELS[status]}</Badge>
  );
}

const EVENT_TONE: Record<EventStatus, Tone> = {
  draft: "neutral",
  published: "success",
  completed: "info",
  cancelled: "danger",
};

export function EventBadge({ status }: { status: EventStatus }) {
  return <Badge tone={EVENT_TONE[status]}>{EVENT_STATUS_LABELS[status]}</Badge>;
}

const CLEARANCE_TONE: Record<ClearanceStatus, Tone> = {
  none: "neutral",
  submitted: "warning",
  cleared: "success",
  expired: "danger",
};

export function ClearanceBadge({ status }: { status: ClearanceStatus }) {
  return (
    <Badge tone={CLEARANCE_TONE[status]}>{CLEARANCE_LABELS[status]}</Badge>
  );
}
