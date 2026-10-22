"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ReactNode, Suspense, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useEvent } from "@/components/hooks/useEvents";
import { useThreads } from "@/components/hooks/useMessages";
import { useSession } from "@/components/hooks/useSession";
import ThreadList from "@/components/messages/ThreadList";
import Container from "@/components/layout/Container";
import { Pagination, Spinner } from "@/components/ui/Primitives";
import { cn } from "@/lib/utils";

/**
 * The inbox: conversations on the left, the open one on the right. Stays
 * mounted while switching conversations so the list keeps its place. On
 * small screens only one pane shows at a time.
 */
function Inbox({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const { threadId } = useParams<{ threadId?: string }>();
  const eventId = useSearchParams().get("eventId") ?? undefined;
  const event = useEvent(eventId ?? "");
  // Admins see every thread in the org, so they only get a list scoped to one event.
  const showList = !!user && (user.role !== "admin" || !!eventId);

  return (
    <Container className="py-6">
      <div className="mb-4">
        {eventId ? (
          <Link
            href={`/organizer/events/${eventId}`}
            className="mb-1 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-500 hover:text-brand-700"
          >
            <ChevronLeft className="h-4 w-4" /> {event.data?.title ?? "Event"}
          </Link>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          Messages
        </h1>
      </div>
      <div
        className={cn(
          "grid h-[calc(100dvh-10rem)] grid-rows-[minmax(0,1fr)] min-h-[28rem] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card",
          showList && "lg:grid-cols-[340px_1fr]"
        )}
      >
        {!user ? (
          <Spinner />
        ) : (
          <>
            {showList ? (
              <aside
                className={cn(
                  "min-h-0 flex-col border-ink-100 lg:flex lg:border-r",
                  threadId ? "hidden" : "flex"
                )}
              >
                <ConversationList
                  currentUserId={user._id}
                  staff={user.role !== "volunteer"}
                  eventId={eventId}
                  selectedId={threadId}
                />
              </aside>
            ) : null}
            <section
              className={cn(
                "min-h-0 min-w-0 flex-col lg:flex",
                threadId || !showList ? "flex" : "hidden"
              )}
            >
              {children}
            </section>
          </>
        )}
      </div>
    </Container>
  );
}

function ConversationList({
  currentUserId,
  staff,
  eventId,
  selectedId,
}: {
  currentUserId: string;
  staff: boolean;
  eventId?: string;
  selectedId?: string;
}) {
  const [page, setPage] = useState(1);
  const threads = useThreads({ page: String(page), eventId });

  if (threads.isPending) return <Spinner />;
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ThreadList
          threads={threads.data?.items ?? []}
          currentUserId={currentUserId}
          selectedId={selectedId}
          eventId={eventId}
          emptyText={
            staff && eventId
              ? "Nobody has written about this event yet. Use “Write a message” on the event page to reach the roster."
              : "Start a conversation from an event you signed up for."
          }
        />
      </div>
      {threads.data ? (
        <div className="border-t border-ink-100 px-4 pb-3 empty:hidden [&>nav]:mt-3">
          <Pagination
            page={threads.data.page}
            total={threads.data.total}
            pageSize={threads.data.pageSize}
            onPage={setPage}
          />
        </div>
      ) : null}
    </>
  );
}

export default function MessagesLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <Inbox>{children}</Inbox>
    </Suspense>
  );
}
