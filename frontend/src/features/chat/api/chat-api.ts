import { fetch } from 'expo/fetch';

import { useSessionStore } from '@/features/auth/store/session-store';
import { parseStreamChunkBuffer } from '@/features/chat/streaming/parse-stream-chunks';
import type {
  PaginatedMessages,
  SendMessagePayload,
  SendMessageResponse,
  StreamEvent,
} from '@/features/chat/types/chat-types';
import { httpClient, toAppError } from '@/shared/api/http-client';
import { env } from '@/shared/config/env';

export async function listMessages(args: {
  chatId: string;
  cursor?: string;
  limit?: number;
}): Promise<PaginatedMessages> {
  const response = await httpClient.get(`/chats/${args.chatId}/messages`, {
    params: {
      cursor: args.cursor,
      limit: args.limit ?? 30,
    },
  });
  // Unwrap NestJS ResponseInterceptor envelope: { data: { items, nextCursor } }
  const envelope = response.data as { data?: PaginatedMessages };
  return envelope.data ?? response.data;
}

export async function sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
  const response = await httpClient.post(`/chats/${payload.chatId}/messages`, {
    content: payload.content,
  });
  // Unwrap NestJS ResponseInterceptor envelope: { data: { userMessage, assistantMessageId } }
  const envelope = response.data as { data?: SendMessageResponse };
  return envelope.data ?? response.data;
}

function toAbsoluteUrl(path: string): string {
  const trimmedBase = env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  const trimmedPath = path.replace(/^\/+/, '');
  return `${trimmedBase}/${trimmedPath}`;
}

export async function streamAssistantMessage(args: {
  chatId: string;
  assistantMessageId: string;
  onEvent: (event: StreamEvent) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const accessToken = useSessionStore.getState().accessToken;
  const response = await fetch(toAbsoluteUrl(`/chats/${args.chatId}/stream`), {
    method: 'POST',
    signal: args.signal,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      assistantMessageId: args.assistantMessageId,
    }),
  });

  if (!response.ok || !response.body) {
    const statusText = response.statusText || 'Streaming request failed';
    throw toAppError(new Error(statusText));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parsed = parseStreamChunkBuffer(buffer);
    buffer = parsed.remainder;
    for (const event of parsed.events) {
      args.onEvent(event);
    }
  }

  if (buffer.trim()) {
    const parsed = parseStreamChunkBuffer(`${buffer}\n`);
    for (const event of parsed.events) {
      args.onEvent(event);
    }
  }

  args.onEvent({ type: 'done' });
}
