"use client";

import Link from "next/link";
import { Flag, Lock, ShieldAlert } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Primitives";
import type { ClientThreadSummary } from "@/http/messageHTTPClient";
import { formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

export default function ThreadList({
  threads,
  currentUserId,
  emptyText,
}: {
  threads: ClientThreadSummary[];
  currentUserId: string;
  emptyText: string;
}) {
  if (!threads.length)
    return <EmptyState title="No conversations" description={emptyText} />;
  return (
    <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white shadow-card">
      {threads.map(
        ({
          thread,
          eventTitle,
          counterpartName,
          lastMessage,
          unread,
          reported,
        }) => (
          <li key={thread._id}>
            <Link
              href={`/messages/${thread._id}`}
              className={cn(
                "grid gap-1 px-4 py-3 hover:bg-ink-50",
                unread ? "bg-brand-50/40" : undefined
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={cn(
                    "text-sm text-ink-900",
                    unread ? "font-bold" : "font-semibold"
                  )}
                >
                  {counterpartName}
                </p>
                <span className="text-[13px] text-ink-500">· {eventTitle}</span>
                {unread ? <Badge tone="brand">{unread} new</Badge> : null}
                {thread.status === "read_only" ? (
                  <Badge>
                    <Lock className="mr-1 h-3 w-3" />
                    Closed
                  </Badge>
                ) : null}
                {thread.involvesMinor ? (
                  <Badge tone="info">
                    <ShieldAlert className="mr-1 h-3 w-3" />
                    Minor
                  </Badge>
                ) : null}
                {reported ? (
                  <Badge tone="danger">
                    <Flag className="mr-1 h-3 w-3" />
                    Reported
                  </Badge>
                ) : null}
                <span className="ml-auto text-xs text-ink-400">
                  {formatRelative(thread.lastMessageAt)}
                </span>
              </div>
              {lastMessage ? (
                <p className="truncate text-sm text-ink-600">
                  {lastMessage.senderId === currentUserId ? "You: " : ""}
                  {lastMessage.body}
                </p>
              ) : null}
            </Link>
          </li>
        )
      )}
    </ul>
  );
}
