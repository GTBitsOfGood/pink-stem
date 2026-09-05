"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import { Alert, PageHeader, Spinner } from "@/components/ui/Primitives";
import { errorMessage } from "@/components/ui/Toast";
import UserHTTPClient from "@/http/userHTTPClient";

/** Public page a parent or guardian lands on from the consent email. */
export default function ConsentPage() {
  const { token } = useParams<{ token: string }>();
  const info = useQuery({
    queryKey: ["consent", token],
    queryFn: () => UserHTTPClient.consentInfo(token),
    retry: false,
  });
  const consent = useMutation({
    mutationFn: () => UserHTTPClient.giveConsent(token),
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
          {errorMessage(info.error)} Ask the volunteer to send a new consent
          request from their profile.
        </Alert>
      </Container>
    );
  }

  const {
    volunteerName,
    guardianEmail,
    orgName,
    waiverText,
    codeOfConductText,
    alreadyConsented,
  } = info.data;
  return (
    <Container className="max-w-2xl py-10">
      <PageHeader
        eyebrow="Parent or guardian consent"
        title={`${volunteerName} wants to volunteer with ${orgName}`}
        description={`This request was sent to ${guardianEmail}. Please read both documents, then give consent below.`}
      />
      {consent.isSuccess || alreadyConsented ? (
        <Alert tone="success" title="Consent recorded">
          Thank you. {volunteerName} can now be confirmed for shifts. Pink STEM
          staff review every volunteer, and messages in the Volunteer Hub are
          visible to administrators.
        </Alert>
      ) : (
        <div className="grid gap-5">
          <Card>
            <CardHeader title="Volunteer waiver" />
            <CardBody className="whitespace-pre-wrap text-sm leading-6 text-ink-700">
              {waiverText}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Code of conduct" />
            <CardBody className="whitespace-pre-wrap text-sm leading-6 text-ink-700">
              {codeOfConductText}
            </CardBody>
          </Card>
          {consent.error ? (
            <Alert tone="danger">{errorMessage(consent.error)}</Alert>
          ) : null}
          <Button
            size="lg"
            loading={consent.isPending}
            onClick={() => consent.mutate()}
          >
            I am {volunteerName}&apos;s parent or guardian and I consent
          </Button>
        </div>
      )}
    </Container>
  );
}
