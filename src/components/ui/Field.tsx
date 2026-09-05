"use client";

import {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  useId,
} from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (id: string, describedBy: string | undefined) => ReactNode;
  className?: string;
}

/** Every input has a real label; hints and errors are wired up for screen readers. */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink-800">
        {label}
        {required ? (
          <span className="ml-0.5 text-brand-600" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-red-700" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClasses = (invalid?: boolean, className?: string) =>
  cn(
    "h-10 w-full rounded-xl border bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-brand-600 disabled:bg-ink-50",
    invalid ? "border-red-400" : "border-ink-200",
    className
  );

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({
  label,
  hint,
  error,
  required,
  className,
  ...props
}: InputProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {(id, describedBy) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          required={required}
          className={inputClasses(!!error)}
          {...props}
        />
      )}
    </Field>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Textarea({
  label,
  hint,
  error,
  required,
  className,
  rows = 4,
  ...props
}: TextareaProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {(id, describedBy) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          required={required}
          rows={rows}
          className={inputClasses(!!error, "h-auto py-2.5")}
          {...props}
        />
      )}
    </Field>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({
  label,
  hint,
  error,
  required,
  className,
  options,
  placeholder,
  ...props
}: SelectProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {(id, describedBy) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          required={required}
          className={inputClasses(!!error, "pr-8")}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label: string;
  description?: string;
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: CheckboxProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 bg-white p-3 transition-colors has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50",
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
        {...props}
      />
      <span className="grid gap-0.5">
        <span className="text-sm font-semibold text-ink-800">{label}</span>
        {description ? (
          <span className="text-[13px] text-ink-500">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
