"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import Card, { CardBody } from "@/components/ui/Card";
import { DescriptionList, Spinner } from "@/components/ui/Primitives";
import { CERTIFICATE_TYPE_LABELS } from "@/constants/labels";
import CertificateHTTPClient from "@/http/certificateHTTPClient";
import { formatHours, formatLongDate, formatShortDate } from "@/lib/dates";

/** Public verification. Shows validity, name, hours, dates, and nothing else. */
export default function VerifyResult({ code }: { code: string }) {
  const result = useQuery({
    queryKey: ["verify", code],
    queryFn: () => CertificateHTTPClient.verify(code),
    retry: false,
  });

  if (result.isPending) return <Spinner label="Checking" />;
  if (result.isError) {
    return (
      <Card>
        <CardBody className="text-sm text-ink-600">
          We could not check that code right now. Please try again in a moment.
        </CardBody>
      </Card>
    );
  }

  const r = result.data;
  const heading = {
    valid: {
      icon: <CircleCheck className="h-8 w-8 text-emerald-600" />,
      title: "Valid certificate",
      tone: "text-emerald-800",
    },
    revoked: {
      icon: <CircleX className="h-8 w-8 text-red-600" />,
      title: "Revoked certificate",
      tone: "text-red-800",
    },
    not_found: {
      icon: <CircleAlert className="h-8 w-8 text-amber-600" />,
      title: "No certificate matches this code",
      tone: "text-amber-900",
    },
  }[r.status];

  return (
    <Card>
      <CardBody className="grid gap-5">
        <div className="flex items-center gap-3">
          {heading.icon}
          <div>
            <p className={`text-lg font-bold ${heading.tone}`}>
              {heading.title}
            </p>
            <p className="font-mono text-sm text-ink-500">
              {code.toUpperCase()}
            </p>
          </div>
        </div>
        {r.status === "not_found" ? (
          <p className="text-sm text-ink-600">
            Check the code for typos. Codes are sixteen characters in four
            groups and never contain the letters O, I, or L.
          </p>
        ) : (
          <>
            {r.status === "revoked" ? (
              <p className="text-sm text-ink-600">
                This certificate was issued and later revoked by Pink STEM,
                usually because the hours were corrected and a replacement
                issued. Ask the volunteer for their current certificate.
              </p>
            ) : null}
            <DescriptionList
              items={[
                { label: "Volunteer", value: r.volunteerName },
                {
                  label: "Document",
                  value: r.type ? CERTIFICATE_TYPE_LABELS[r.type] : "—",
                },
                {
                  label: "Approved hours",
                  value: r.totalHours != null ? formatHours(r.totalHours) : "—",
                },
                {
                  label: "Period",
                  value:
                    r.periodStart && r.periodEnd
                      ? `${formatShortDate(r.periodStart)} – ${formatShortDate(r.periodEnd)}`
                      : "—",
                },
                {
                  label: "Issued",
                  value: r.issuedAt ? formatLongDate(r.issuedAt) : "—",
                },
              ]}
            />
            <p className="text-xs text-ink-500">
              Hours were recorded by the event organizer and approved before
              entering the volunteer&apos;s ledger. Pink STEM, Inc. is a
              501(c)(3) nonprofit based in Atlanta, Georgia.
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}
