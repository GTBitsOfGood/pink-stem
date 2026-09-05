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

function LoginForm() {
  const next = useSearchParams().get("next") ?? "/dashboard";
  const { login, google } = useAuthActions(next);
  const { values, set } = useFormValues({ email: "", password: "" });
  const error = login.error ?? google.error;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(values);
  };

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to see your shifts, hours, and messages."
      footer={
        <>
          New to Pink STEM?{" "}
          <Link
            href="/register"
            className="font-semibold text-brand-700 hover:underline"
          >
            Create a volunteer account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4">
        {error ? <Alert tone="danger">{errorMessage(error)}</Alert> : null}
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
          autoComplete="current-password"
          required
          value={values.password}
          onChange={(e) => set("password")(e.target.value)}
        />
        <div className="-mt-2 text-right">
          <Link
            href="/forgot-password"
            className="text-[13px] font-semibold text-brand-700 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
        <Button type="submit" size="lg" loading={login.isPending}>
          Sign in
        </Button>
      </form>
      <GoogleButton onCredential={(credential) => google.mutate(credential)} />
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
