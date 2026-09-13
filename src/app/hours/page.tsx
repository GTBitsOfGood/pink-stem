"use client";

import { FormEvent, useState } from "react";
import CertificateList from "@/components/hours/CertificateList";
import { useMyHours, useSignupActions } from "@/components/hooks/useSignups";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader, Stat } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { PageHeader, Spinner, Table, td, th } from "@/components/ui/Primitives";
import { errorMessage, useToast } from "@/components/ui/Toast";
import { formatHours, formatShortDate, toDateInput } from "@/lib/dates";

export default function HoursPage() {
  const hours = useMyHours();
  const { requestServiceRecord } = useSignupActions();
  const toast = useToast();
  const year = new Date().getFullYear();
  const [period, setPeriod] = useState({
    periodStart: `${year}-01-01`,
    periodEnd: toDateInput(new Date()),
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await requestServiceRecord.mutateAsync(period);
      toast("Your service record is ready to download.");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        eyebrow="Hours & certificates"
        title="Your service record"
        description="Hours enter this ledger only when an organizer approves the roster. Certificates are immutable and verify publicly."
      />
      {hours.isPending || !hours.data ? (
        <Spinner />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid content-start gap-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat
                label="Approved hours"
                value={formatHours(hours.data.total)}
                tone="brand"
              />
              <Stat
                label="Events"
                value={new Set(hours.data.entries.map((e) => e.eventId)).size}
              />
              <Stat
                label="Active certificates"
                value={
                  hours.data.certificates.filter((c) => !c.revokedAt).length
                }
              />
            </div>
            <Card>
              <CardHeader
                title="Ledger"
                description="Every approval and correction, newest first."
              />
              {hours.data.entries.length ? (
                <Table className="rounded-none border-0 shadow-none">
                  <thead>
                    <tr>
                      <th className={th}>Event</th>
                      <th className={th}>Event date</th>
                      <th className={th}>Approved</th>
                      <th className={th}>Note</th>
                      <th className={`${th} text-right`}>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hours.data.entries.map((e) => (
                      <tr key={e._id}>
                        <td className={`${td} font-semibold text-ink-900`}>
                          {e.eventTitle}
                        </td>
                        <td className={td}>{formatShortDate(e.eventDate)}</td>
                        <td className={td}>{formatShortDate(e.approvedAt)}</td>
                        <td className={`${td} text-ink-500`}>
                          {e.reversalOf
                            ? `Correction: ${e.reason}`
                            : (e.reason ?? "Roster approval")}
                        </td>
                        <td
                          className={`${td} text-right tabular ${e.hours < 0 ? "text-red-700" : ""}`}
                        >
                          {e.hours > 0 ? "+" : ""}
                          {e.hours}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <CardBody className="text-sm text-ink-500">
                  No approved hours yet. They appear here after your first
                  completed shift.
                </CardBody>
              )}
            </Card>
            <Card>
              <CardHeader title="Certificates" />
              <CertificateList certificates={hours.data.certificates} />
            </Card>
          </div>
          <Card className="h-fit">
            <CardHeader
              eyebrow="For applications"
              title="Request a service record"
              description="A signed letter on Pink STEM letterhead listing every event in the range, with a total and a verification code. Generated instantly."
            />
            <CardBody>
              <form onSubmit={submit} className="grid gap-3">
                <Input
                  label="From"
                  type="date"
                  required
                  value={period.periodStart}
                  onChange={(e) =>
                    setPeriod({ ...period, periodStart: e.target.value })
                  }
                />
                <Input
                  label="To"
                  type="date"
                  required
                  value={period.periodEnd}
                  onChange={(e) =>
                    setPeriod({ ...period, periodEnd: e.target.value })
                  }
                />
                <Button type="submit" loading={requestServiceRecord.isPending}>
                  Generate service record
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </Container>
  );
}
