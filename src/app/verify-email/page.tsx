"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import AuthCard from "@/components/auth/AuthCard";
import { useAuthActions } from "@/components/hooks/useAuthActions";
import { useSession } from "@/components/hooks/useSession";
import { ButtonLink } from "@/components/ui/Button";
import { Alert, Spinner } from "@/components/ui/Primitives";
import { errorMessage } from "@/components/ui/Toast";

function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  const { verifyEmail } = useAuthActions();
  const { user } = useSession();
  const { mutate } = verifyEmail;

  useEffect(() => {
    if (token) mutate(token);
  }, [token, mutate]);

  return (
    <AuthCard title="Verifying your email">
      {!token ? (
        <Alert tone="danger">
          This link is missing its token. Open the link from your email again.
        </Alert>
      ) : verifyEmail.isPending || verifyEmail.isIdle ? (
        <Spinner label="Confirming" />
      ) : verifyEmail.isError ? (
        <Alert tone="danger">{errorMessage(verifyEmail.error)}</Alert>
      ) : (
        <div className="grid gap-4">
          <Alert tone="success" title="Your email is verified">
            Any sign-ups that were waiting on this have been re-checked.
          </Alert>
          <ButtonLink href={user ? "/dashboard" : "/login"}>
            {user ? "Go to my shifts" : "Sign in"}
          </ButtonLink>
        </div>
      )}
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
