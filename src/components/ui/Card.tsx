import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-200 bg-white shadow-card",
        className
      )}
      {...props}
    />
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
}

export function CardHeader({
  title,
  description,
  action,
  eyebrow,
}: CardHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h2 className="text-base font-bold text-ink-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

interface StatProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "brand";
}

export function Stat({ label, value, hint, tone = "default" }: StatProps) {
  return (
    <Card className="px-5 py-4">
      <p className="text-[13px] font-semibold text-ink-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular",
          tone === "brand" ? "text-brand-700" : "text-ink-900"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[13px] text-ink-500">{hint}</p> : null}
    </Card>
  );
}
