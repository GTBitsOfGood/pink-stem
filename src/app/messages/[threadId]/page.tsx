"use client";

import { useParams } from "next/navigation";
import { useThread } from "@/components/hooks/useMessages";
import { useSession } from "@/components/hooks/useSession";
import ThreadView from "@/components/messages/ThreadView";
import Container from "@/components/layout/Container";
import { EmptyState, PageHeader, Spinner } from "@/components/ui/Primitives";
import { errorMessage } from "@/components/ui/Toast";

export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const thread = useThread(threadId);
  const { user } = useSession();

  return (
    <Container className="max-w-4xl py-8 sm:py-10">
      <PageHeader
        eyebrow="Messages"
        title="Conversation"
        back={{ href: "/messages", label: "All conversations" }}
      />
      {thread.isPending || !user ? (
        <Spinner />
      ) : thread.isError ? (
        <EmptyState
          title="Conversation unavailable"
          description={errorMessage(thread.error)}
        />
      ) : (
        <ThreadView detail={thread.data} currentUserId={user._id} />
      )}
    </Container>
  );
}
