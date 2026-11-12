"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";

/**
 * Help for a status label, shown in the top layer. The button is the native
 * popover invoker, so a tap or click toggles it and Escape or an outside tap
 * dismisses it; hover and keyboard focus also show it.
 */
export default function LabelHelp({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [open, setOpen] = useState(false);

  const show = () => {
    clearTimeout(hideTimer.current);
    if (!tip.current?.matches(":popover-open")) tip.current?.showPopover();
  };
  const hide = () => {
    clearTimeout(hideTimer.current);
    if (tip.current?.matches(":popover-open")) tip.current.hidePopover();
  };
  const hideSoon = () => {
    clearTimeout(hideTimer.current);
    if (!trigger.current?.matches(":focus-visible"))
      hideTimer.current = setTimeout(hide, 100);
  };

  // Placed before it shows: below the button, or above when there is more
  // room there, clamped to the viewport so it never needs measuring.
  const place = () => {
    const box = trigger.current?.getBoundingClientRect();
    const style = tip.current?.style;
    if (!box || !style) return;
    const width = Math.min(256, window.innerWidth - 16);
    style.left = `${Math.max(8, Math.min(box.left, window.innerWidth - width - 8))}px`;
    const above = box.top > window.innerHeight - box.bottom;
    style.top = above ? "auto" : `${box.bottom + 8}px`;
    style.bottom = above ? `${window.innerHeight - box.top + 8}px` : "auto";
  };

  // A fixed tip would drift from its label, so scrolling or resizing closes it.
  useEffect(() => {
    if (!open) return;
    const close = () => {
      if (tip.current?.matches(":popover-open")) tip.current.hidePopover();
    };
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        popoverTarget={id}
        aria-label={`About ${label}`}
        aria-describedby={id}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") show();
        }}
        onPointerLeave={hideSoon}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) show();
        }}
        onBlur={hide}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <CircleHelp className="h-4 w-4" aria-hidden />
      </button>
      <span
        ref={tip}
        id={id}
        popover="auto"
        role="tooltip"
        onBeforeToggle={(event) => {
          if (event.newState === "open") place();
        }}
        onToggle={(event) => setOpen(event.newState === "open")}
        onPointerEnter={() => clearTimeout(hideTimer.current)}
        onPointerLeave={hideSoon}
        className="fixed inset-auto m-0 w-64 max-w-[calc(100vw-1rem)] rounded-xl border border-ink-200 bg-white p-3 text-left text-sm font-normal leading-6 text-ink-700 shadow-raised"
      >
        {children}
      </span>
    </>
  );
}
