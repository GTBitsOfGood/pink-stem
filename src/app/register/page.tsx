"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense } from "react";
import AuthCard from "@/components/auth/AuthCard";
import GoogleButton from "@/components/auth/GoogleButton";
import { useAuthActions } from "@/components/hooks/useAuthActions";
import { useFormValues } from "@/components/hooks/useFormValues";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Primitives";
import { errorMessage } from "@/components/ui/Toast";
import { PASSWORD_MIN_LENGTH } from "@/constants/limits";
import { isMinor } from "@/lib/dates";

function RegisterForm() {
  const next = useSearchParams().get("next") ?? "/dashboard";
  const { register, google } = useAuthActions(next);
  const { values, set } = useFormValues({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    dateOfBirth: "",
    guardianEmail: "",
    phone: "",
  });
  const minor = values.dateOfBirth ? isMinor(values.dateOfBirth) : false;
  const error = register.error ?? google.error;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    register.mutate({
      ...values,
      guardianEmail: minor ? values.guardianEmail : undefined,
      phone: values.phone || undefined,
    });
  };

  return (
    <AuthCard
      title="Become a Pink STEM volunteer"
      description="Mentor, coach, and cheer on girls exploring science, technology, engineering, and math."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-700 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4">
        {error ? <Alert tone="danger">{errorMessage(error)}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            autoComplete="given-name"
            required
            value={values.firstName}
            onChange={(e) => set("firstName")(e.target.value)}
          />
          <Input
            label="Last name"
            autoComplete="family-name"
            required
            value={values.lastName}
            onChange={(e) => set("lastName")(e.target.value)}
          />
        </div>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={(e) => set("email")(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters with a number.`}
          value={values.password}
          onChange={(e) => set("password")(e.target.value)}
        />
        <Input
          label="Date of birth"
          type="date"
          required
          hint="Used only to confirm age requirements. Volunteers under 18 need a parent or guardian's consent."
          value={values.dateOfBirth}
          onChange={(e) => set("dateOfBirth")(e.target.value)}
        />
        {minor ? (
          <Input
            label="Parent or guardian email"
            type="email"
            required
            hint="We will email them a consent link. Sign-ups stay pending until they respond."
            value={values.guardianEmail}
            onChange={(e) => set("guardianEmail")(e.target.value)}
          />
        ) : null}
        <Input
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(e) => set("phone")(e.target.value)}
        />
        <Button type="submit" size="lg" loading={register.isPending}>
          Create account
        </Button>
        <p className="text-center text-xs text-ink-500">
          By continuing you agree to Pink STEM&apos;s volunteer waiver and code
          of conduct, which you will review before your first sign-up.
        </p>
      </form>
      <GoogleButton onCredential={(credential) => google.mutate(credential)} />
    </AuthCard>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
