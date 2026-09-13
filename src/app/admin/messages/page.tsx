"use client";

import { useState } from "react";
import { useThreads } from "@/components/hooks/useMessages";
import { useSession } from "@/components/hooks/useSession";
import ThreadList from "@/components/messages/ThreadList";
import { Checkbox } from "@/components/ui/Field";
import {
  Alert,
  PageHeader,
  Pagination,
  Spinner,
} from "@/components/ui/Primitives";

export default function AdminMessagesPage() {
  const { user } = useSession();
  const [filters, setFilters] = useState({
    involvesMinor: false,
    reported: false,
    page: 1,
  });
  const threads = useThreads({
    involvesMinor: filters.involvesMinor ? "true" : "",
    reported: filters.reported ? "true" : "",
    page: String(filters.page),
  });

  return (
    <div>
      <PageHeader
        title="Message oversight"
        description="Every conversation in the hub. Reading a thread you are not part of is recorded in the audit log."
      />
      <Alert tone="info" className="mb-4">
        Threads involving a volunteer under 18 are flagged at creation and
        retained through the full retention period regardless of account status.
      </Alert>
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <Checkbox
          label="Involves a minor"
          checked={filters.involvesMinor}
          onChange={(e) =>
            setFilters({ ...filters, involvesMinor: e.target.checked, page: 1 })
          }
        />
        <Checkbox
          label="Has a reported message"
          checked={filters.reported}
          onChange={(e) =>
            setFilters({ ...filters, reported: e.target.checked, page: 1 })
          }
        />
      </div>
      {threads.isPending || !user ? (
        <Spinner />
      ) : (
        <>
          <ThreadList
            threads={threads.data?.items ?? []}
            currentUserId={user._id}
            emptyText="No conversations match these filters."
          />
          {threads.data ? (
            <Pagination
              page={threads.data.page}
              total={threads.data.total}
              pageSize={threads.data.pageSize}
              onPage={(page) => setFilters({ ...filters, page })}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
