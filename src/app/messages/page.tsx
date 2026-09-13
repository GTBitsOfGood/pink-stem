"use client";

import { useState } from "react";
import { useThreads } from "@/components/hooks/useMessages";
import { useSession } from "@/components/hooks/useSession";
import ThreadList from "@/components/messages/ThreadList";
import Container from "@/components/layout/Container";
import {
  Alert,
  PageHeader,
  Pagination,
  Spinner,
} from "@/components/ui/Primitives";

export default function MessagesPage() {
  const { user } = useSession();
  const [page, setPage] = useState(1);
  const threads = useThreads({ page: String(page) });

  return (
    <Container className="max-w-4xl py-8 sm:py-10">
      <PageHeader
        eyebrow="Messages"
        title="Conversations"
        description="Every conversation is attached to an event. Organizers answer questions here so the record stays in one place."
      />
      <Alert tone="info" className="mb-4">
        Messages are visible to Pink STEM administrators. Volunteers never
        message each other through the hub.
      </Alert>
      {threads.isPending || !user ? (
        <Spinner />
      ) : (
        <>
          <ThreadList
            threads={threads.data?.items ?? []}
            currentUserId={user._id}
            emptyText="Open an event you are signed up for and use “Message the organizer” to start one."
          />
          {threads.data ? (
            <Pagination
              page={threads.data.page}
              total={threads.data.total}
              pageSize={threads.data.pageSize}
              onPage={setPage}
            />
          ) : null}
        </>
      )}
    </Container>
  );
}
