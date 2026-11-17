"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { useTopDialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import { HTTPError } from "@/types/exceptions";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<
  ((message: string, tone?: ToastTone) => void) | null
>(null);

const ICON: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  error: <CircleAlert className="h-5 w-5 text-red-600" />,
  info: <Info className="h-5 w-5 text-sky-600" />,
};

/*
 * Toasts sit in the top layer as a manual popover, so they show above modal
 * dialogs. Showing it again on each mount puts it above whatever is newest.
 */
const showOnTop = (region: HTMLDivElement | null) => {
  if (region?.showPopover && !region.matches(":popover-open")) {
    region.showPopover();
  }
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Everything outside an open modal dialog is inert, so toasts move into it.
  const dialog = useTopDialog();

  const dismiss = useCallback(
    (id: number) => setToasts((all) => all.filter((t) => t.id !== id)),
    []
  );
  const push = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = Date.now() + Math.random();
      setToasts((all) => [...all, { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === "error" ? 8000 : 4500);
    },
    [dismiss]
  );
  const value = useMemo(() => push, [push]);

  // The popover's default box styles are reset so it lays out as it did before.
  const region = (
    <div
      ref={showOnTop}
      popover="manual"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 top-auto z-50 m-0 flex h-auto w-auto flex-col items-center gap-2 overflow-visible border-0 bg-transparent px-4 py-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-raised animate-fade-up",
            toast.tone === "error" ? "border-red-200" : "border-ink-200"
          )}
        >
          {ICON[toast.tone]}
          <p className="flex-1 text-ink-800">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss"
            className="text-ink-400 hover:text-ink-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {dialog ? createPortal(region, dialog) : region}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error("useToast must be used within ToastProvider");
  return push;
}

/** Pulls a readable message out of anything a mutation can throw. */
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";

/** True when a request was turned away by a rate limit, not rejected. */
export const isRateLimited = (error: unknown) =>
  error instanceof HTTPError && error.status === 429;
