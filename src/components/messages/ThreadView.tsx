"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Flag, Lock, ShieldAlert } from "lucide-react";
import { useMessageActions } from "@/components/hooks/useMessages";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Primitives";
import { errorMessage, useToast } from "@/components/ui/Toast";
import type { ClientThreadDetail } from "@/http/messageHTTPClient";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export default function ThreadView({
  detail,
  currentUserId,
}: {
  detail: ClientThreadDetail;
  currentUserId: string;
}) {
  const { send, report } = useMessageActions(detail.thread._id);
  const toast = useToast();
  const [body, setBody] = useState("");
  const [reporting, setReporting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [detail.messages.length]);

  const nameOf = (senderId: string) =>
    senderId === detail.participants.volunteer.id
      ? detail.participants.volunteer.name
      : detail.participants.organizer.name;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      const result = await send.mutateAsync(body.trim());
      setBody("");
      if (result.notice) toast(result.notice, "info");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-ink-200 bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink-900">
              {detail.participants.volunteer.name}{" "}
              <span className="font-normal text-ink-400">and</span>{" "}
              {detail.participants.organizer.name}
            </p>
            <Link
              href={`/events/${detail.eventId}`}
              className="text-[13px] font-semibold text-brand-700 hover:underline"
            >
              {detail.eventTitle}
            </Link>
          </div>
          {detail.thread.involvesMinor ? (
            <Badge tone="info">
              <ShieldAlert className="mr-1 h-3 w-3" />
              Involves a minor · reviewed periodically
            </Badge>
          ) : null}
          {detail.thread.status === "read_only" ? (
            <Badge>
              <Lock className="mr-1 h-3 w-3" />
              Read only
            </Badge>
          ) : null}
        </div>
        <ol className="grid max-h-[60vh] gap-3 overflow-y-auto px-4 py-4">
          {detail.messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <li
                key={m._id}
                className={cn(
                  "group flex max-w-[85%] flex-col gap-1",
                  mine ? "self-end items-end" : "self-start items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap",
                    mine ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-900"
                  )}
                >
                  {m.body}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-ink-400">
                  <span>
                    {nameOf(m.senderId)} · {formatDateTime(m.sentAt)}
                  </span>
                  {m.reportedAt ? (
                    <Badge tone="danger">Reported</Badge>
                  ) : !mine && !detail.isAdminView ? (
                    <button
                      type="button"
                      onClick={() => setReporting(m._id)}
                      className="inline-flex items-center gap-1 opacity-0 hover:text-red-700 focus:opacity-100 group-hover:opacity-100"
                    >
                      <Flag className="h-3 w-3" /> Report
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
          <div ref={endRef} />
        </ol>
      </div>

      {detail.isAdminView ? (
        <Alert tone="info">
          You are reading this as an administrator. Your access has been
          recorded in the audit log.
        </Alert>
      ) : detail.canReply ? (
        <form onSubmit={submit} className="grid gap-2">
          <Textarea
            label="Reply"
            className="[&>label]:sr-only"
            rows={3}
            placeholder="Write a reply…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-400">
              Visible to Pink STEM administrators. Text only.
            </p>
            <Button
              type="submit"
              loading={send.isPending}
              disabled={!body.trim()}
            >
              Send
            </Button>
          </div>
        </form>
      ) : (
        <Alert tone="info">
          This conversation is closed and can no longer be replied to.
        </Alert>
      )}

      <Dialog
        open={!!reporting}
        onClose={() => setReporting(null)}
        title="Report this message"
        description="Pink STEM administrators will review it. Reports are confidential."
      >
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await report.mutateAsync({
                messageId: reporting as string,
                reason,
              });
              setReporting(null);
              setReason("");
              toast("Reported. An administrator will review it.");
            } catch (error) {
              toast(errorMessage(error), "error");
            }
          }}
        >
          <Textarea
            label="What is wrong?"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setReporting(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={report.isPending}>
              Report
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
