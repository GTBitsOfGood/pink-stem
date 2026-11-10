"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, Suspense } from "react";

import AuthCard from "@/components/auth/AuthCard";
import { useFormValues } from "@/components/hooks/useFormValues";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Primitives";
import { errorMessage } from "@/components/ui/Toast";
import { PASSWORD_MIN_LENGTH } from "@/constants/limits";
import { QUERY_KEYS } from "@/constants/queryKeys";
import AuthHTTPClient from "@/http/authHTTPClient";

function RegisterForm() {
  const queryClient = useQueryClient();
  const register = useMutation({
    mutationFn: AuthHTTPClient.register,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session }),
  });
  const { values, set } = useFormValues({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    dateOfBirth: "",
    phone: "",
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    register.mutate({
      ...values,
      phone: values.phone || undefined,
    });
  };

  if (register.isSuccess) {
    return (
      <AuthCard
        title="Check your email"
        description="One more step before you can get confirmed for shifts."
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
        <Alert tone="info" title="Verification link sent">
          We sent a link to <strong>{values.email}</strong>. Click it to confirm
          your email address — sign-ups stay pending until you do.
        </Alert>
        <Link
          href="/dashboard"
          className="mt-4 block text-center text-sm font-semibold text-brand-700 hover:underline"
        >
          Continue to dashboard →
        </Link>
      </AuthCard>
    );
  }

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
        {register.error ? (
          <Alert tone="danger">{errorMessage(register.error)}</Alert>
        ) : null}
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
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          value={values.password}
          onChange={(e) => set("password")(e.target.value)}
        />
        <Input
          label="Date of birth"
          type="date"
          required
          hint="Used only to confirm age requirements."
          value={values.dateOfBirth}
          onChange={(e) => set("dateOfBirth")(e.target.value)}
        />
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
          Volunteers sign Pink STEM&apos;s waiver for each event they sign up
          for.
        </p>
      </form>
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
