"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import AuthCard from "@/components/auth/AuthCard";
import { useAuthActions } from "@/components/hooks/useAuthActions";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Primitives";
import { errorMessage } from "@/components/ui/Toast";
import { PASSWORD_MIN_LENGTH } from "@/constants/limits";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const { resetPassword } = useAuthActions();
  const [password, setPassword] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    resetPassword.mutate({ token, password });
  };

  return (
    <AuthCard
      title="Choose a new password"
      footer={
        <Link
          href="/login"
          className="font-semibold text-brand-700 hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      {!token ? (
        <Alert tone="danger">
          This link is missing its token. Open the link from your email again.
        </Alert>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          {resetPassword.error ? (
            <Alert tone="danger">{errorMessage(resetPassword.error)}</Alert>
          ) : null}
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            hint={`At least ${PASSWORD_MIN_LENGTH} characters with a number.`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" size="lg" loading={resetPassword.isPending}>
            Save and sign in
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
