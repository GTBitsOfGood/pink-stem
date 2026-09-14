"use client";

import { useState } from "react";
import { useProfile } from "@/components/hooks/useProfile";
import { useSession } from "@/components/hooks/useSession";
import Container from "@/components/layout/Container";
import ProfileForm from "@/components/profile/ProfileForm";
import WaiverDialog from "@/components/profile/WaiverDialog";
import Badge, { ClearanceBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader, Spinner } from "@/components/ui/Primitives";
import { ROLE_LABELS } from "@/constants/labels";
import { formatLongDate } from "@/lib/dates";

export default function ProfilePage() {
  const { me, user } = useSession();
  const { acceptWaiver } = useProfile();
  const [waiverOpen, setWaiverOpen] = useState(false);

  if (!me || !user)
    return (
      <Container className="py-10">
        <Spinner />
      </Container>
    );
  const waiverCurrent = (user.waiverVersionAccepted ?? 0) >= me.waiverVersion;

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        eyebrow="Profile"
        title={`${user.firstName} ${user.lastName}`}
        description={
          <span className="inline-flex items-center gap-2">
            {user.email} <Badge tone="brand">{ROLE_LABELS[user.role]}</Badge>
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <ProfileForm user={user} />
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader title="Background clearance" />
            <CardBody className="grid gap-2 text-sm text-ink-600">
              <ClearanceBadge status={me.clearance?.status ?? "none"} />
              {me.clearance?.expiresOn ? (
                <p>Valid through {formatLongDate(me.clearance.expiresOn)}.</p>
              ) : null}
              <p>
                Pink STEM runs a background screening for every volunteer who
                works with students and records the outcome here. Contact staff
                to start or renew yours.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Waiver & code of conduct" />
            <CardBody className="grid gap-3 text-sm text-ink-600">
              {waiverCurrent ? (
                <p>
                  Accepted{" "}
                  {user.waiverAcceptedAt
                    ? formatLongDate(user.waiverAcceptedAt)
                    : ""}{" "}
                  (version {user.waiverVersionAccepted}).
                </p>
              ) : (
                <p className="text-amber-800">
                  {user.waiverVersionAccepted
                    ? "The waiver has been updated since you last accepted it."
                    : "Not yet accepted."}{" "}
                  You will be asked to accept it at your next sign-up.
                </p>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setWaiverOpen(true)}
              >
                {waiverCurrent
                  ? "Read the current version"
                  : "Review and accept"}
              </Button>
            </CardBody>
          </Card>
          {me.isMinor ? (
            <Card>
              <CardHeader title="Guardian consent" />
              <CardBody className="text-sm text-ink-600">
                {user.guardianConsentAt ? (
                  <p>
                    Consent given by {user.guardianEmail} on{" "}
                    {formatLongDate(user.guardianConsentAt)}.
                  </p>
                ) : (
                  <p>
                    Waiting on {user.guardianEmail}. Resend the link from your
                    dashboard if it has not arrived.
                  </p>
                )}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
      <WaiverDialog
        open={waiverOpen}
        onClose={() => setWaiverOpen(false)}
        onAccept={() => acceptWaiver.mutateAsync()}
      />
    </Container>
  );
}
