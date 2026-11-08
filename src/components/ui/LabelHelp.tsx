"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";

/** Optional label help in the top layer, reachable by hover, keyboard or touch. */
export default function LabelHelp({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);

  const cancelHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };
  const hide = () => {
    cancelHide();
    if (popover.current?.matches(":popover-open"))
      popover.current.hidePopover();
  };
  const show = () => {
    cancelHide();
    const tip = popover.current;
    const button = trigger.current;
    if (!tip || !button || tip.matches(":popover-open")) return;
    tip.showPopover();
    const rect = button.getBoundingClientRect();
    tip.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - tip.offsetWidth - 8))}px`;
    tip.style.top = `${
      rect.bottom + tip.offsetHeight + 8 <= window.innerHeight - 8
        ? rect.bottom + 8
        : Math.max(8, rect.top - tip.offsetHeight - 8)
    }px`;
  };
  const scheduleHide = () => {
    cancelHide();
    if (!trigger.current?.matches(":focus-visible")) {
      hideTimer.current = setTimeout(hide, 100);
    }
  };

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    const dismiss = () => {
      if (popover.current?.matches(":popover-open"))
        popover.current.hidePopover();
    };
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={`About ${label}`}
        aria-controls={id}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") show();
        }}
        onPointerLeave={scheduleHide}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) show();
        }}
        onBlur={hide}
        onClick={() => {
          if (popover.current?.matches(":popover-open")) hide();
          else show();
        }}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <CircleHelp className="h-4 w-4" aria-hidden />
      </button>
      <span
        ref={popover}
        id={id}
        popover="auto"
        role="tooltip"
        onToggle={() =>
          setOpen(popover.current?.matches(":popover-open") ?? false)
        }
        onPointerEnter={cancelHide}
        onPointerLeave={scheduleHide}
        className="fixed inset-auto m-0 w-64 max-w-[calc(100vw-1rem)] rounded-xl border border-ink-200 bg-white p-3 text-left text-sm font-normal leading-6 text-ink-700 shadow-raised"
      >
        {children}
      </span>
    </>
  );
}
