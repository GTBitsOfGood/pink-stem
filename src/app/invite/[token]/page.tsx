"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { FormEvent } from "react";
import AuthCard from "@/components/auth/AuthCard";
import { useAuthActions } from "@/components/hooks/useAuthActions";
import { useFormValues } from "@/components/hooks/useFormValues";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert, Spinner } from "@/components/ui/Primitives";
import { errorMessage } from "@/components/ui/Toast";
import { ROLE_LABELS } from "@/constants/labels";
import { PASSWORD_MIN_LENGTH } from "@/constants/limits";
import AuthHTTPClient from "@/http/authHTTPClient";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const invite = useQuery({
    queryKey: ["invite", token],
    queryFn: () => AuthHTTPClient.getInvite(token),
    retry: false,
  });
  const { acceptInvite } = useAuthActions("/organizer");
  const { values, set } = useFormValues({
    firstName: "",
    lastName: "",
    password: "",
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    acceptInvite.mutate({ token, ...values });
  };

  if (invite.isPending)
    return (
      <AuthCard title="Checking your invitation">
        <Spinner />
      </AuthCard>
    );
  if (invite.isError)
    return (
      <AuthCard title="Invitation not found">
        <Alert tone="danger">{errorMessage(invite.error)}</Alert>
      </AuthCard>
    );

  const role = ROLE_LABELS[invite.data.role].toLowerCase();
  return (
    <AuthCard
      title={`Join Pink STEM as an ${role}`}
      description={
        invite.data.existingAccount
          ? `Your existing account (${invite.data.email}) will become an ${role} account. Set a password to continue.`
          : `This invitation is for ${invite.data.email}. Set up your account to get started.`
      }
    >
      <form onSubmit={submit} className="grid gap-4">
        {acceptInvite.error ? (
          <Alert tone="danger">{errorMessage(acceptInvite.error)}</Alert>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            required
            value={values.firstName}
            onChange={(e) => set("firstName")(e.target.value)}
          />
          <Input
            label="Last name"
            required
            value={values.lastName}
            onChange={(e) => set("lastName")(e.target.value)}
          />
        </div>
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
        <Button type="submit" size="lg" loading={acceptInvite.isPending}>
          Accept invitation
        </Button>
      </form>
    </AuthCard>
  );
}
