"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useThread } from "@/components/hooks/useMessages";
import { useSession } from "@/components/hooks/useSession";
import ThreadView from "@/components/messages/ThreadView";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { EmptyState, Spinner } from "@/components/ui/Primitives";
import { errorMessage } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const eventId = useSearchParams().get("eventId");
  const thread = useThread(threadId);
  const { user } = useSession();
  const queryClient = useQueryClient();
  const messageCount = thread.data?.messages.length;

  // Loading the thread marks it read, so refresh the list's dot and the header count.
  useEffect(() => {
    if (messageCount === undefined) return;
    queryClient.invalidateQueries({
      queryKey: ["threads"],
      predicate: (q) => typeof q.queryKey[1] === "object",
    });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });
  }, [threadId, messageCount, queryClient]);

  if (thread.isPending || !user) return <Spinner />;

  // Matches the layout: admins only get the list when it is scoped to one event.
  const listShown = user.role !== "admin" || !!eventId;
  const toList = {
    href: eventId ? `/messages?eventId=${eventId}` : "/messages",
    label: "Conversations",
    always: false,
  };

  // The back arrow lives in ThreadView, so a failed load needs its own way out.
  if (thread.isError)
    return (
      <div className="p-4">
        <EmptyState
          title="Conversation unavailable"
          description={errorMessage(thread.error)}
          action={
            <Link
              href={listShown ? toList.href : "/admin"}
              className={cn(
                "inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline",
                listShown && "lg:hidden"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              {listShown ? "Back to conversations" : "Back to Approvals"}
            </Link>
          }
        />
      </div>
    );

  const back = listShown
    ? toList
    : thread.data.isAdminView
      ? { href: "/admin", label: "Approvals", always: true }
      : {
          href: `/messages?eventId=${thread.data.eventId}`,
          label: thread.data.eventTitle,
          always: true,
        };

  return (
    <ThreadView
      key={threadId}
      detail={thread.data}
      currentUserId={user._id}
      back={back}
    />
  );
}
