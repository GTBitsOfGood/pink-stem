"use client";

import { useSession } from "@/components/hooks/useSession";
import Container from "@/components/layout/Container";
import PasswordForm from "@/components/profile/PasswordForm";
import ProfileForm from "@/components/profile/ProfileForm";
import Badge, { ClearanceBadge } from "@/components/ui/Badge";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader, Spinner } from "@/components/ui/Primitives";
import { ROLE_LABELS } from "@/constants/labels";
import { formatLongDate } from "@/lib/dates";

export default function ProfilePage() {
  const { me, user } = useSession();

  if (!me || !user)
    return (
      <Container className="py-10">
        <Spinner />
      </Container>
    );

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
          <PasswordForm />
        </div>
      </div>
    </Container>
  );
}
