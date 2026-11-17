"use client";

import { Download } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { CERTIFICATE_TYPE_LABELS } from "@/constants/labels";
import CertificateHTTPClient from "@/http/certificateHTTPClient";
import type { ClientCertificate } from "@/http/userHTTPClient";
import { formatHours, formatShortDate } from "@/lib/dates";
import { ReactNode } from "react";

export default function CertificateList({
  certificates,
  action,
}: {
  certificates: ClientCertificate[];
  action?: (certificate: ClientCertificate) => ReactNode;
}) {
  if (!certificates.length)
    return (
      <p className="px-5 py-4 text-sm text-ink-500">
        No certificates yet. One is issued for every event where your hours are
        approved.
      </p>
    );
  return (
    <ul className="divide-y divide-ink-100">
      {certificates.map((c) => (
        <li
          key={c._id}
          className="grid gap-2 px-5 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-ink-900">
                {c.type === "event"
                  ? (c.items[0]?.eventTitle ?? "Event certificate")
                  : `Service record · ${formatShortDate(c.periodStart)} – ${formatShortDate(c.periodEnd)}`}
              </p>
              <Badge tone={c.revokedAt ? "danger" : "success"}>
                {c.revokedAt ? "Revoked" : "Valid"}
              </Badge>
            </div>
            <p className="text-[13px] text-ink-500">
              {CERTIFICATE_TYPE_LABELS[c.type]} · {formatHours(c.totalHours)} ·
              issued {formatShortDate(c.issuedAt)} ·{" "}
              <span className="font-mono">{c.verificationCode}</span>
            </p>
            {c.revokedAt ? (
              <p className="text-[13px] text-red-700">
                Revoked: {c.revocationReason}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <a
              href={CertificateHTTPClient.pdfUrl(c._id)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-[13px] font-semibold text-ink-700 hover:bg-ink-50"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </a>
            {action?.(c)}
          </div>
        </li>
      ))}
    </ul>
  );
}
