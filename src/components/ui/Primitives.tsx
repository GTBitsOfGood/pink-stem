import Link from "next/link";
import { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  back?: { href: string; label: string };
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  back,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back ? (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-500 hover:text-brand-700"
          >
            <ChevronLeft className="h-4 w-4" /> {back.label}
          </Link>
        ) : null}
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <div className="mt-1 max-w-2xl text-sm text-ink-500 sm:text-[15px]">
            {description}
          </div>
        ) : null}
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap gap-2">{action}</div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-ink-300 bg-white px-6 py-12 text-center",
        className
      )}
    >
      <p className="text-base font-semibold text-ink-800">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 py-12 text-sm text-ink-500"
    >
      <span
        className="h-5 w-5 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600"
        aria-hidden
      />
      {label}…
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tones[tone],
        className
      )}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-0.5" : undefined}>{children}</div>
    </div>
  );
}

export function Pagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-between text-sm text-ink-500"
    >
      <span>
        Page {page} of {pages} · {total} total
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="rounded-lg border border-ink-200 bg-white p-1.5 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
          className="rounded-lg border border-ink-200 bg-white p-1.5 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

export function DescriptionList({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[13px] font-semibold text-ink-500">
            {item.label}
          </dt>
          <dd className="mt-0.5 break-words text-sm text-ink-900">
            {item.value ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Table({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-card",
        className
      )}
    >
      <table className="w-full min-w-[640px] text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export const th =
  "px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-500 border-b border-ink-100 bg-ink-50/60";
export const td = "px-4 py-3 border-b border-ink-100 align-top";
