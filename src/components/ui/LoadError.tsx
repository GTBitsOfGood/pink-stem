"use client";

import Button from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Primitives";
import { errorMessage } from "@/components/ui/Toast";

/** A query that failed, in place of a spinner or a misleading empty result. */
export default function LoadError({
  title,
  query,
}: {
  title: string;
  query: { error: unknown; isFetching: boolean; refetch: () => unknown };
}) {
  return (
    <EmptyState
      title={title}
      description={errorMessage(query.error)}
      action={
        <Button
          variant="secondary"
          loading={query.isFetching}
          onClick={() => query.refetch()}
        >
          Try again
        </Button>
      }
    />
  );
}
