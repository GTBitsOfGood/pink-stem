"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import { Alert, PageHeader, Spinner } from "@/components/ui/Primitives";
import { errorMessage, isRateLimited } from "@/components/ui/Toast";
import { QUERY_KEYS } from "@/constants/queryKeys";
import UserHTTPClient from "@/http/userHTTPClient";

/** Public page reached from the "confirm your email" link. */
export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const info = useQuery({
    queryKey: ["verify-email", token],
    queryFn: () => UserHTTPClient.verifyEmailInfo(token),
    retry: false,
  });
  const queryClient = useQueryClient();
  const verify = useMutation({
    mutationFn: () => UserHTTPClient.confirmEmailVerification(token),
    // A signed-in tab would otherwise keep showing the outstanding item.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mySignups });
    },
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
        {isRateLimited(info.error) ? (
          <Alert tone="danger" title="Too many attempts">
            {errorMessage(info.error)}
          </Alert>
        ) : (
          <Alert tone="danger" title="This link is no longer valid">
            {errorMessage(info.error)} If you already confirmed your email,
            there is nothing more to do. Otherwise, sign in and request a new
            verification link from your dashboard.
          </Alert>
        )}
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
