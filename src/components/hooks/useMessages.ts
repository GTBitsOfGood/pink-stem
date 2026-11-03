"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { compactFilters } from "@/http/fetchHTTPClient";
import MessageHTTPClient from "@/http/messageHTTPClient";

export function useThreads(filters: Record<string, string | undefined>) {
  const clean = compactFilters(filters);
  return useQuery({
    queryKey: QUERY_KEYS.threads(clean),
    queryFn: () => MessageHTTPClient.list(clean),
    placeholderData: (previous) => previous,
  });
}

export function useThread(threadId: string) {
  const queryClient = useQueryClient();
  const invalidatedFor = useRef<string | null>(null);
  const query = useQuery({
    queryKey: QUERY_KEYS.thread(threadId),
    queryFn: () => MessageHTTPClient.get(threadId),
    enabled: !!threadId,
    refetchInterval: 30_000,
  });

  // The GET marks the thread read on the server. Refresh the session only
  // after that fresh request finishes so its unread count cannot lag behind.
  useEffect(() => {
    if (
      threadId &&
      query.isSuccess &&
      query.fetchStatus === "idle" &&
      invalidatedFor.current !== threadId
    ) {
      invalidatedFor.current = threadId;
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });
    }
  }, [query.fetchStatus, query.isSuccess, queryClient, threadId]);

  return query;
}

export function useMessageActions(threadId?: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["threads"] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });
  };

  return {
    createThread: useMutation({
      mutationFn: ({
        eventId,
        body,
        volunteerId,
      }: {
        eventId: string;
        body: string;
        volunteerId?: string;
      }) => MessageHTTPClient.createThread(eventId, body, volunteerId),
      onSuccess: invalidate,
    }),
    send: useMutation({
      mutationFn: (body: string) =>
        MessageHTTPClient.send(threadId as string, body),
      onSuccess: invalidate,
    }),
    report: useMutation({
      mutationFn: ({
        messageId,
        reason,
      }: {
        messageId: string;
        reason: string;
      }) => MessageHTTPClient.report(threadId as string, messageId, reason),
      onSuccess: invalidate,
    }),
    reviewReports: useMutation({
      mutationFn: () => MessageHTTPClient.reviewReports(threadId as string),
      onSuccess: () => {
        invalidate();
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.admin.approvals,
        });
      },
    }),
  };
}
