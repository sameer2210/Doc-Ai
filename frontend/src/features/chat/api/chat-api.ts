import { fetchWithAuth } from '@/shared/api/fetch-with-auth';
import { parseStreamChunkBuffer } from '@/features/chat/streaming/parse-stream-chunks';
import type {
  PaginatedMessages,
  SendMessagePayload,
  SendMessageResponse,
  StreamEvent,
} from '@/features/chat/types/chat-types';
import { httpClient, toAppError } from '@/shared/api/http-client';
import { env } from '@/shared/config/env';

const activeStreamControllers = new Map<string, AbortController>();

export function abortActiveChatStreams(): void {
  activeStreamControllers.forEach(controller => controller.abort());
  activeStreamControllers.clear();
}

type ApiEnvelope<T> = {
  data?: ApiEnvelope<T> | T;
};

function unwrapApiPayload<T>(body: unknown): T {
  const envelope = body as ApiEnvelope<T> | undefined;
  const levelOne = envelope?.data;
  const levelTwo = (levelOne as ApiEnvelope<T> | undefined)?.data;
  const levelThree = (levelTwo as ApiEnvelope<T> | undefined)?.data;
  return (levelThree ?? levelTwo ?? levelOne ?? body) as T;
}

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
  const payload = unwrapApiPayload<PaginatedMessages>(response.data);
 
  return payload;
}

export async function sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
  const response = await httpClient.post(
    `/chats/${payload.chatId}/messages`,
    {
      content: payload.content,
      attachments: payload.attachments,
    },
    {
      headers: {
        'Idempotency-Key': payload.idempotencyKey,
      },
    }
  );
  return unwrapApiPayload<SendMessageResponse>(response.data);
}

export async function startConsultation(payload: {
  chatId: string;
  prediction: string;
  confidence: number;
}): Promise<SendMessageResponse & { limitReached?: boolean }> {
  const response = await httpClient.post(`/chats/${payload.chatId}/consultation`, {
    prediction: payload.prediction,
    confidence: payload.confidence,
  });
  return unwrapApiPayload<SendMessageResponse & { limitReached?: boolean }>(response.data);
}

function toAbsoluteUrl(path: string): string {
  const trimmedBase = env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  const trimmedPath = path.replace(/^\/+/, '');
  return `${trimmedBase}/${trimmedPath}`;
}

function createLinkedAbortController(signal?: AbortSignal): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  if (!signal) {
    return { controller, cleanup: () => undefined };
  }
  if (signal.aborted) {
    controller.abort();
    return { controller, cleanup: () => undefined };
  }

  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  return {
    controller,
    cleanup: () => signal.removeEventListener('abort', abort),
  };
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

  if (activeStreamControllers.has(args.assistantMessageId)) {
    throw new Error(`Active stream already exists for ${args.assistantMessageId}`);
  }

  const linked = createLinkedAbortController(args.signal);
  activeStreamControllers.set(args.assistantMessageId, linked.controller);

  let sawTerminalEvent = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  try {
    const response = await fetchWithAuth(toAbsoluteUrl(`/chats/${args.chatId}/stream`), {
      method: 'POST',
      signal: linked.controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        assistantMessageId: args.assistantMessageId,
      }),
    });

    if (!response.ok || !response.body) {
      const bodyText = await response.text().catch(() => '');
      const statusText = response.statusText || 'Streaming request failed';
      throw toAppError(new Error(`${statusText}${bodyText ? `: ${bodyText}` : ''}`));
    }

    reader = response.body.getReader();
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
        if (sawTerminalEvent) {
          continue;
        }

        if (event.type === 'done' || event.type === 'error') {
          sawTerminalEvent = true;
        }

        args.onEvent(event);
      }
    }

    if (buffer.trim()) {
      const parsed = parseStreamChunkBuffer(`${buffer}\n`);
      for (const event of parsed.events) {
        if (sawTerminalEvent) {
          continue;
        }

        if (event.type === 'done' || event.type === 'error') {
          sawTerminalEvent = true;
        }

        args.onEvent(event);
      }
    }

    if (!sawTerminalEvent) {
      args.onEvent({ type: 'done' });
    }
  } catch (error) {
    if (linked.controller.signal.aborted || args.signal?.aborted) {
      return;
    }
    throw error;
  } finally {
    if (reader) {
      try {
        reader.releaseLock();
      } catch {
        // noop
      }
    }
    linked.cleanup();
    activeStreamControllers.delete(args.assistantMessageId);
  }
}

export type ChatSessionInfo = {
  id: string;
  title: string;
  updatedAt: string;
  lastMessage: string | null;
  messageCount: number;
};

export async function listChats(): Promise<ChatSessionInfo[]> {
  const response = await httpClient.get('/chats');
  return unwrapApiPayload<ChatSessionInfo[]>(response.data);
}

export async function createChat(): Promise<{ id: string; title: string }> {
  const response = await httpClient.post('/chats');
  return unwrapApiPayload<{ id: string; title: string }>(response.data);
}

export async function deleteChat(chatId: string): Promise<void> {
  await httpClient.delete(`/chats/${chatId}`);
}
