"use client";

import Link from "next/link";
import { Flag, Lock, ShieldAlert } from "lucide-react";
import type { ClientThreadSummary } from "@/http/messageHTTPClient";
import { formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

export default function ThreadList({
  threads,
  currentUserId,
  selectedId,
  eventId,
  emptyText,
}: {
  threads: ClientThreadSummary[];
  currentUserId: string;
  selectedId?: string;
  /** Kept on row links so a list scoped to one event stays scoped. */
  eventId?: string;
  emptyText: string;
}) {
  if (!threads.length)
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm font-semibold text-ink-800">No conversations</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-ink-500">
          {emptyText}
        </p>
      </div>
    );
  return (
    <ul className="divide-y divide-ink-100">
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
              href={`/messages/${thread._id}${eventId ? `?eventId=${eventId}` : ""}`}
              aria-current={thread._id === selectedId ? "page" : undefined}
              className={cn(
                "grid grid-cols-1 gap-0.5 px-4 py-3 hover:bg-ink-50",
                thread._id === selectedId && "bg-brand-50 hover:bg-brand-50"
              )}
            >
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm text-ink-900",
                    unread ? "font-bold" : "font-semibold"
                  )}
                >
                  {counterpartName}
                </p>
                <span className="shrink-0 text-xs text-ink-400">
                  {formatRelative(thread.lastMessageAt)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-ink-500">
                <span className="min-w-0 flex-1 truncate">{eventTitle}</span>
                {thread.involvesMinor ? (
                  <ShieldAlert
                    className="h-3.5 w-3.5 shrink-0 text-sky-600"
                    aria-label="Involves a minor"
                  />
                ) : null}
                {thread.status === "read_only" ? (
                  <Lock
                    className="h-3.5 w-3.5 shrink-0 text-ink-400"
                    aria-label="Closed"
                  />
                ) : null}
                {reported ? (
                  <Flag
                    className="h-3.5 w-3.5 shrink-0 text-red-600"
                    aria-label="Reported"
                  />
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    unread ? "text-ink-900" : "text-ink-500"
                  )}
                >
                  {lastMessage
                    ? `${lastMessage.senderId === currentUserId ? "You: " : ""}${lastMessage.body}`
                    : ""}
                </p>
                {unread ? (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600"
                    aria-label={`${unread} unread`}
                  />
                ) : null}
              </div>
            </Link>
          </li>
        )
      )}
    </ul>
  );
}
