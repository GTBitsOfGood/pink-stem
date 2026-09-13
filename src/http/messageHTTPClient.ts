import fetchHTTPClient, { toQuery } from "@/http/fetchHTTPClient";
import type { Paginated, ThreadDetail, ThreadSummary } from "@/types/api";
import type { Message, MessageThread } from "@/types/message";
import type { Doc, Serialized } from "@/types/models";

export type ClientThreadSummary = Serialized<ThreadSummary>;
export type ClientThreadDetail = Serialized<ThreadDetail>;
export type ClientMessage = Serialized<Doc<Message>>;
export type ClientThread = Serialized<Doc<MessageThread>>;

export interface SendResult {
  message: ClientMessage;
  notice?: string;
}

export default class MessageHTTPClient {
  static list(
    filters: Record<string, string | undefined>
  ): Promise<Paginated<ClientThreadSummary>> {
    return fetchHTTPClient(`/threads${toQuery(filters)}`);
  }

  static get(threadId: string): Promise<ClientThreadDetail> {
    return fetchHTTPClient(`/threads/${threadId}`);
  }

  static createThread(
    eventId: string,
    body: string,
    volunteerId?: string
  ): Promise<SendResult & { thread: ClientThread }> {
    return fetchHTTPClient("/threads", "POST", { eventId, body, volunteerId });
  }

  static send(threadId: string, body: string): Promise<SendResult> {
    return fetchHTTPClient(`/threads/${threadId}/messages`, "POST", { body });
  }

  static report(
    threadId: string,
    messageId: string,
    reason: string
  ): Promise<void> {
    return fetchHTTPClient(`/threads/${threadId}/report`, "POST", {
      messageId,
      reason,
    });
  }
}
