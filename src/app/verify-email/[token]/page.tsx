"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import { Alert, PageHeader, Spinner } from "@/components/ui/Primitives";
import { errorMessage } from "@/components/ui/Toast";
import UserHTTPClient from "@/http/userHTTPClient";

/** Public page reached from the "confirm your email" link. */
export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const info = useQuery({
    queryKey: ["verify-email", token],
    queryFn: () => UserHTTPClient.verifyEmailInfo(token),
    retry: false,
  });
  const verify = useMutation({
    mutationFn: () => UserHTTPClient.confirmEmailVerification(token),
  });

  if (info.isPending)
    return (
      <Container className="py-12">
        <Spinner />
      </Container>
    );
  if (info.isError) {
    return (
      <Container className="max-w-2xl py-12">
        <Alert tone="danger" title="This link is no longer valid">
          {errorMessage(info.error)} Sign in and request a new verification link
          from your profile.
        </Alert>
      </Container>
    );
  }

  const { firstName, alreadyVerified } = info.data;
  return (
    <Container className="max-w-2xl py-10">
      <PageHeader
        eyebrow="Confirm your email"
        title={`Hi ${firstName}, let's confirm this is your email address`}
      />
      {verify.isSuccess || alreadyVerified ? (
        <Alert tone="success" title="Email confirmed">
          Thank you. Your sign-ups can now be confirmed, subject to each
          event&apos;s other requirements.
        </Alert>
      ) : (
        <div className="grid gap-4">
          {verify.error ? (
            <Alert tone="danger">{errorMessage(verify.error)}</Alert>
          ) : null}
          <Button
            size="lg"
            loading={verify.isPending}
            onClick={() => verify.mutate()}
          >
            Confirm my email
          </Button>
        </div>
      )}
    </Container>
  );
}
