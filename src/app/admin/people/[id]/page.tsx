"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import AdjustHoursDialog from "@/components/admin/AdjustHoursDialog";
import ClearanceForm from "@/components/admin/ClearanceForm";
import CertificateList from "@/components/hours/CertificateList";
import { useAdminActions, usePerson } from "@/components/hooks/useAdmin";
import { useSession } from "@/components/hooks/useSession";
import Badge, { SignupBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader, Stat } from "@/components/ui/Card";
import Dialog from "@/components/ui/Dialog";
import { Select, Textarea } from "@/components/ui/Field";
import {
  DescriptionList,
  EmptyState,
  PageHeader,
  Spinner,
  Table,
  td,
  th,
} from "@/components/ui/Primitives";
import { errorMessage, useToast } from "@/components/ui/Toast";
import {
  AUDIT_ACTION_LABELS,
  REGION_LABELS,
  ROLE_LABELS,
  SKILL_LABELS,
} from "@/constants/labels";
import {
  formatDate,
  formatDateTime,
  formatHours,
  formatShortDate,
} from "@/lib/dates";
import { ROLES, Role } from "@/types/user";

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const person = usePerson(id);
  const { user: admin } = useSession();
  const actions = useAdminActions(id);
  const toast = useToast();
  const [adjusting, setAdjusting] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  if (person.isPending) return <Spinner />;
  if (person.isError)
    return (
      <EmptyState
        title="Person not found"
        description={errorMessage(person.error)}
      />
    );
  const p = person.data;
  const u = p.user;
  const self = admin?._id === u._id;
  const total = p.ledger.reduce((sum, e) => sum + e.hours, 0);

  const run = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      toast(message);
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };

  return (
    <div>
      <PageHeader
        title={`${u.firstName} ${u.lastName}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {u.email} <Badge tone="brand">{ROLE_LABELS[u.role]}</Badge>
            {u.status === "inactive" ? (
              <Badge tone="danger">Inactive</Badge>
            ) : null}
            {u.flaggedForReviewAt ? (
              <Badge tone="warning">Flagged for review</Badge>
            ) : null}
          </span>
        }
        back={{ href: "/admin/people", label: "People" }}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Approved hours"
              value={formatHours(total)}
              tone="brand"
            />
            <Stat
              label="Events attended"
              value={
                p.signups.filter((s) => s.signup.status === "attended").length
              }
            />
            <Stat
              label="No-shows"
              value={
                p.signups.filter((s) => s.signup.status === "no_show").length
              }
            />
          </div>
          <Card>
            <CardHeader title="Profile" />
            <CardBody>
              <DescriptionList
                items={[
                  { label: "Phone", value: u.phone },
                  {
                    label: "City / region",
                    value: [u.city, u.region && REGION_LABELS[u.region]]
                      .filter(Boolean)
                      .join(" · "),
                  },
                  {
                    label: "Date of birth",
                    value: u.dateOfBirth
                      ? formatShortDate(u.dateOfBirth)
                      : null,
                  },
                  {
                    label: "Guardian",
                    value: u.guardianEmail
                      ? `${u.guardianEmail}${u.guardianConsentAt ? ` · consented ${formatShortDate(u.guardianConsentAt)}` : " · consent pending"}`
                      : null,
                  },
                  {
                    label: "Emergency contact",
                    value: u.emergencyContact?.name
                      ? `${u.emergencyContact.name} · ${u.emergencyContact.phone}`
                      : null,
                  },
                  {
                    label: "Skills",
                    value:
                      u.skills.map((s) => SKILL_LABELS[s]).join(", ") || null,
                  },
                  {
                    label: "Waiver",
                    value: u.waiverVersionAccepted
                      ? `v${u.waiverVersionAccepted} on ${formatShortDate(u.waiverAcceptedAt!)}`
                      : "Not accepted",
                  },
                  { label: "Joined", value: formatShortDate(u.createdAt) },
                ]}
              />
              {u.bio ? (
                <p className="mt-4 text-sm text-ink-700">{u.bio}</p>
              ) : null}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Sign-ups" />
            {p.signups.length ? (
              <Table className="rounded-none border-0 shadow-none">
                <thead>
                  <tr>
                    <th className={th}>Event</th>
                    <th className={th}>Shift</th>
                    <th className={th}>Status</th>
                    <th className={th}>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {[...p.signups].reverse().map(({ signup, shift, event }) => (
                    <tr key={signup._id}>
                      <td className={td}>
                        <Link
                          href={`/events/${event._id}`}
                          className="font-semibold hover:text-brand-800"
                        >
                          {event.title}
                        </Link>
                        <div className="text-[12px] text-ink-500">
                          {formatDate(shift.startsAt)}
                        </div>
                      </td>
                      <td className={td}>{shift.roleName}</td>
                      <td className={td}>
                        <SignupBadge status={signup.status} />
                      </td>
                      <td className={td}>
                        {signup.attendance
                          ? formatHours(signup.attendance.hours)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <CardBody className="text-sm text-ink-500">No sign-ups.</CardBody>
            )}
          </Card>
          <Card>
            <CardHeader
              title="Hours ledger"
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setAdjusting(true)}
                  disabled={!p.ledger.length}
                >
                  Adjust hours
                </Button>
              }
            />
            {p.ledger.length ? (
              <Table className="rounded-none border-0 shadow-none">
                <thead>
                  <tr>
                    <th className={th}>Event</th>
                    <th className={th}>Approved</th>
                    <th className={th}>Reason</th>
                    <th className={`${th} text-right`}>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {p.ledger.map((e) => (
                    <tr key={e._id}>
                      <td className={td}>{e.eventTitle}</td>
                      <td className={td}>{formatShortDate(e.approvedAt)}</td>
                      <td className={`${td} text-ink-500`}>
                        {e.reason ?? "Roster approval"}
                      </td>
                      <td className={`${td} text-right tabular`}>
                        {e.hours > 0 ? "+" : ""}
                        {e.hours}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <CardBody className="text-sm text-ink-500">
                No ledger entries.
              </CardBody>
            )}
          </Card>
          <Card>
            <CardHeader title="Certificates" />
            <CertificateList
              certificates={p.certificates}
              action={(c) =>
                !c.revokedAt ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setRevoking(c._id)}
                  >
                    Revoke
                  </Button>
                ) : null
              }
            />
          </Card>
          <Card>
            <CardHeader
              title="Audit trail"
              description="Actions by and about this account."
            />
            {p.audit.length ? (
              <Table className="rounded-none border-0 shadow-none">
                <thead>
                  <tr>
                    <th className={th}>When</th>
                    <th className={th}>Actor</th>
                    <th className={th}>Action</th>
                    <th className={th}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {p.audit.map((row) => (
                    <tr key={row._id}>
                      <td className={td}>{formatDateTime(row.createdAt)}</td>
                      <td className={td}>{row.actorName}</td>
                      <td className={td}>{AUDIT_ACTION_LABELS[row.action]}</td>
                      <td className={`${td} font-mono text-xs text-ink-500`}>
                        {row.after ? JSON.stringify(row.after) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <CardBody className="text-sm text-ink-500">
                Nothing recorded.
              </CardBody>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader
              title="Background clearance"
              description="Recorded outcome of a check run elsewhere. Organizers only ever see a cleared / not cleared flag."
            />
            <CardBody>
              {p.clearance?.recordedBy ? (
                <p className="mb-3 text-[13px] text-ink-500">
                  Last recorded {formatShortDate(p.clearance.updatedAt)}.
                </p>
              ) : null}
              <ClearanceForm person={p} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Account" />
            <CardBody className="grid gap-3">
              <Select
                label="Role"
                options={ROLES.map((r) => ({
                  value: r,
                  label: ROLE_LABELS[r],
                }))}
                value={u.role}
                disabled={self}
                onChange={(e) =>
                  run(
                    () =>
                      actions.updateUser.mutateAsync({
                        role: e.target.value as Role,
                      }),
                    "Role updated. Their sessions were reset."
                  )
                }
              />
              {u.status === "active" ? (
                <Button
                  variant="danger"
                  disabled={self}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Deactivate this account? Login is blocked immediately and future sign-ups are released. Past hours and certificates are kept."
                      )
                    )
                      run(
                        () =>
                          actions.updateUser.mutateAsync({
                            status: "inactive",
                          }),
                        "Account deactivated."
                      );
                  }}
                >
                  Deactivate account
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() =>
                    run(
                      () =>
                        actions.updateUser.mutateAsync({ status: "active" }),
                      "Account reactivated."
                    )
                  }
                >
                  Reactivate account
                </Button>
              )}
              <Button
                variant="secondary"
                disabled={self}
                loading={actions.forceSignout.isPending}
                onClick={() =>
                  run(
                    () => actions.forceSignout.mutateAsync(),
                    "Signed out of every device."
                  )
                }
              >
                Force sign-out
              </Button>
              {u.flaggedForReviewAt ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    run(
                      () =>
                        actions.updateUser.mutateAsync({
                          clearReviewFlag: true,
                        }),
                      "Review flag cleared."
                    )
                  }
                >
                  Clear review flag
                </Button>
              ) : null}
              <p className="text-[12px] text-ink-500">
                Conversations involving this account: {p.threadCount}.{" "}
                <Link
                  href="/admin/messages"
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Message oversight
                </Link>
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      <AdjustHoursDialog
        person={p}
        open={adjusting}
        onClose={() => setAdjusting(false)}
      />
      {revoking ? (
        <RevokeDialog
          certificateId={revoking}
          onClose={() => setRevoking(null)}
          onRevoke={(reason) =>
            run(
              () =>
                actions.revokeCertificate.mutateAsync({
                  certificateId: revoking,
                  reason,
                }),
              "Certificate revoked. Its verification page now shows revoked."
            )
          }
        />
      ) : null}
    </div>
  );
}

function RevokeDialog({
  certificateId,
  onClose,
  onRevoke,
}: {
  certificateId: string;
  onClose: () => void;
  onRevoke: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog
      open
      onClose={onClose}
      title="Revoke this certificate"
      description="The verification page will show it as revoked rather than missing, so a checker learns something real."
    >
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await onRevoke(reason);
          onClose();
        }}
      >
        <Textarea
          label="Reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger">
            Revoke {certificateId.slice(-4)}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
