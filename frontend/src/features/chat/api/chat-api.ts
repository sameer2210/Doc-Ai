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

function unwrapApiPayload<T>(body: any): T {
  return (body?.data?.data?.data ?? body?.data?.data ?? body?.data ?? body) as T;
}

export async function listMessages(args: {
  chatId: string;
  cursor?: string;
  limit?: number;
}): Promise<PaginatedMessages> {
  const accessToken = useSessionStore.getState().accessToken;
  const tokenPreview = accessToken ? `${accessToken.slice(0, 8)}...` : 'none';
  console.log('[chat-api] listMessages request:', {
    chatId: args.chatId,
    cursor: args.cursor ?? null,
    hasAccessToken: Boolean(accessToken),
    tokenPreview,
  });

  const response = await httpClient.get(`/chats/${args.chatId}/messages`, {
    params: {
      cursor: args.cursor,
      limit: args.limit ?? 30,
    },
  });
  const payload = unwrapApiPayload<PaginatedMessages>(response.data);
  console.log('[chat-api] listMessages response:', {
    chatId: args.chatId,
    itemsCount: Array.isArray(payload?.items) ? payload.items.length : 0,
    nextCursor: payload?.nextCursor ?? null,
  });
  return payload;
}

export async function sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
  const response = await httpClient.post(`/chats/${payload.chatId}/messages`, {
    content: payload.content,
  });
  return unwrapApiPayload<SendMessageResponse>(response.data);
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
  if (!args.assistantMessageId) {
    throw new Error('assistantMessageId is missing before stream call');
  }

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

  console.log('[chat-api] streamAssistantMessage response:', {
    chatId: args.chatId,
    assistantMessageId: args.assistantMessageId,
    status: response.status,
    ok: response.ok,
    hasBody: Boolean(response.body),
  });

  if (!response.ok || !response.body) {
    const bodyText = await response.text().catch(() => '');
    const statusText = response.statusText || 'Streaming request failed';
    throw toAppError(new Error(`${statusText}${bodyText ? `: ${bodyText}` : ''}`));
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
