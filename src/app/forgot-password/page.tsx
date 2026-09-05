"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import AuthCard from "@/components/auth/AuthCard";
import { useAuthActions } from "@/components/hooks/useAuthActions";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Primitives";
import { errorMessage } from "@/components/ui/Toast";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuthActions();
  const [email, setEmail] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    forgotPassword.mutate(email);
  };

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we will send a link that works for 30 minutes."
      footer={
        <Link
          href="/login"
          className="font-semibold text-brand-700 hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      {forgotPassword.isSuccess ? (
        <Alert tone="success" title="Check your inbox">
          If an account exists for {email}, a reset link is on its way.
        </Alert>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          {forgotPassword.error ? (
            <Alert tone="danger">{errorMessage(forgotPassword.error)}</Alert>
          ) : null}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" size="lg" loading={forgotPassword.isPending}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
