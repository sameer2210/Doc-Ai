import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useSessionStore } from '@/features/auth/store/session-store';
import { sendMessage, startConsultation, streamAssistantMessage } from '@/features/chat/api/chat-api';
import type { ChatMessage, PaginatedMessages, StreamEvent } from '@/features/chat/types/chat-types';
import { queryKeys } from '@/shared/api/query-keys';

function createOptimisticMessage(partial: Partial<ChatMessage> & Pick<ChatMessage, 'id' | 'chatId'>): ChatMessage {
  return {
    role: 'user',
    content: '',
    createdAt: new Date().toISOString(),
    status: 'pending',
    ...partial,
  };
}

function updateMessagesCache(
  previous: InfiniteData<PaginatedMessages> | undefined,
  updater: (messages: ChatMessage[]) => ChatMessage[]
): InfiniteData<PaginatedMessages> {
  // If no cache exists yet (brand-new chat), start with an empty page
  if (!previous || !Array.isArray(previous.pages) || previous.pages.length === 0) {
    const nextItems = updater([]);
    console.log(`[updateMessagesCache] No previous cache — injecting ${nextItems.length} optimistic message(s) into fresh page.`);
    return {
      pageParams: [undefined],
      pages: [{ items: nextItems, nextCursor: null }],
    };
  }

  return {
    pageParams: previous.pageParams,
    pages: previous.pages.map((page, index) => {
      if (index === 0) {
        const items = Array.isArray(page.items) ? page.items : [];
        console.log(`[updateMessagesCache] Updating first page. Current count: ${items.length}`);
        const nextItems = updater(items);
        console.log(`[updateMessagesCache] First page updated. New count: ${nextItems.length}`);
        return {
          ...page,
          items: nextItems,
        };
      }
      return page;
    }),
  };
}

function generateIdempotencyKey(): string {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `msg_${stamp}_${random}`;
}

const activeStreamMessageIds = new Set<string>();

function applyAssistantStreamEvent(
  message: ChatMessage,
  event: StreamEvent,
): ChatMessage {
  if (event.type === 'token') {
    return {
      ...message,
      content: `${message.content}${event.value}`,
      status: 'streaming',
    };
  }

  if (event.type === 'error') {
    return {
      ...message,
      status: 'error',
      content: message.content || event.message,
    };
  }

  if (!message.content.trim()) {
    return {
      ...message,
      status: 'error',
      content: message.content,
    };
  }

  return {
    ...message,
    status: 'complete',
  };
}

function updateAssistantMessageStatus(args: {
  queryClient: QueryClient;
  queryKey: readonly unknown[];
  assistantMessageId: string;
  event: StreamEvent;
}): void {
  args.queryClient.setQueryData<InfiniteData<PaginatedMessages> | undefined>(
    args.queryKey,
    current =>
      updateMessagesCache(current, messages =>
        messages.map(message =>
          message.id === args.assistantMessageId
            ? applyAssistantStreamEvent(message, args.event)
            : message,
        ),
      ),
  );
}

async function runAssistantStream(args: {
  chatId: string;
  assistantMessageId: string;
  queryClient: QueryClient;
  queryKey: readonly unknown[];
  signal?: AbortSignal;
}): Promise<void> {
  if (activeStreamMessageIds.has(args.assistantMessageId)) {
    return;
  }

  activeStreamMessageIds.add(args.assistantMessageId);
  try {
    await streamAssistantMessage({
      chatId: args.chatId,
      assistantMessageId: args.assistantMessageId,
      signal: args.signal,
      onEvent: event => {
        updateAssistantMessageStatus({
          queryClient: args.queryClient,
          queryKey: args.queryKey,
          assistantMessageId: args.assistantMessageId,
          event,
        });
      },
    });
  } catch {
    updateAssistantMessageStatus({
      queryClient: args.queryClient,
      queryKey: args.queryKey,
      assistantMessageId: args.assistantMessageId,
      event: {
        type: 'error',
        code: 'PROVIDER_ERROR',
        message: 'Stream request failed',
      },
    });
  } finally {
    activeStreamMessageIds.delete(args.assistantMessageId);
  }
}

async function syncMessagesAfterStream(args: {
  queryClient: QueryClient;
  queryKey: readonly unknown[];
}): Promise<void> {
  await args.queryClient.invalidateQueries({
    queryKey: args.queryKey,
    refetchType: 'active',
  });
}

export function useSendMessage(chatId: string) {
  const queryClient = useQueryClient();
  const userId = useSessionStore(state => state.user?.id);
  const key = queryKeys.chats.messages(userId ?? 'anonymous', chatId);
  const streamControllersRef = useRef(new Set<AbortController>());

  useEffect(() => {
    const streamControllers = streamControllersRef.current;
    return () => {
      streamControllers.forEach(controller => controller.abort());
      streamControllers.clear();
    };
  }, []);

  return useMutation({
    mutationFn: async (args: { content: string; attachments?: ChatMessage['attachments'] }) => {
      const idempotencyKey = generateIdempotencyKey();
      console.log('[useSendMessage] mutationFn started:', { chatId, content: args.content, idempotencyKey });
      return sendMessage({
        chatId,
        content: args.content,
        attachments: args.attachments,
        idempotencyKey,
      });
    },
    onMutate: async (args: { content: string; attachments?: ChatMessage['attachments'] }) => {
      console.log('[useSendMessage] onMutate started. Canceling active queries...');
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<InfiniteData<PaginatedMessages>>(key);

      const tempUserId = `temp_user_${generateIdempotencyKey()}`;
      const tempAssistantId = `temp_assistant_${generateIdempotencyKey()}`;
      console.log('[useSendMessage] Created optimistic temporary IDs:', { tempUserId, tempAssistantId });

      queryClient.setQueryData<InfiniteData<PaginatedMessages> | undefined>(key, current =>
        updateMessagesCache(current, messages => [
          createOptimisticMessage({
            id: tempAssistantId,
            localKey: tempAssistantId,
            chatId,
            role: 'assistant',
            content: '',
            status: 'streaming',
          }),
          createOptimisticMessage({
            id: tempUserId,
            localKey: tempUserId,
            chatId,
            role: 'user',
            content: args.content,
            status: 'pending',
            attachments: args.attachments,
          }),
          ...messages,
        ])
      );

      return { previous, tempUserId, tempAssistantId };
    },
    onError: (error, _content, context) => {
      console.error('[useSendMessage] mutation failed:', error);
      if (!context) {
        return;
      }

      console.log('[useSendMessage] Rolling back cache to previous state.');
      queryClient.setQueryData<InfiniteData<PaginatedMessages> | undefined>(
        key,
        context.previous ?? undefined
      );
    },
    onSuccess: async (response, _content, context) => {
      console.log('[useSendMessage] sendMessage successful. Response:', JSON.stringify(response));
      if (!context) {
        return;
      }

      if (!response?.assistantMessageId || !response?.userMessage) {
        console.error('[useSendMessage] Invalid sendMessage response shape:', response);
        await syncMessagesAfterStream({
          queryClient,
          queryKey: key,
        });
        return;
      }

      console.log('[useSendMessage] Updating optimistic messages with actual message IDs...');
      queryClient.setQueryData<InfiniteData<PaginatedMessages> | undefined>(key, current =>
        updateMessagesCache(current, messages =>
          messages.map(message => {
            if (message.id === context.tempUserId) {
              return {
                ...response.userMessage,
                localKey: message.localKey ?? context.tempUserId,
                status: 'complete',
              };
            }
            if (message.id === context.tempAssistantId) {
              console.log('[useSendMessage] temp assistant before replacement:', message);
              const replaced = {
                ...message,
                id: response.assistantMessageId,
                chatId: response.userMessage.chatId,
                createdAt: response.userMessage.createdAt,
                localKey: message.localKey ?? context.tempAssistantId,
                status: 'streaming' as const,
              };
              console.log('[useSendMessage] assistant after replacement:', replaced);
              return replaced;
            }
            return message;
          })
        )
      );

      const streamController = new AbortController();
      streamControllersRef.current.add(streamController);

      try {
        console.log('[useSendMessage] Starting streaming of assistant message with ID:', response.assistantMessageId);
        await runAssistantStream({
          chatId,
          assistantMessageId: response.assistantMessageId,
          queryClient,
          queryKey: key,
          signal: streamController.signal,
        });
      } catch (streamErr) {
        console.error('[useSendMessage] Stream processing failed:', streamErr);
        updateAssistantMessageStatus({
          queryClient,
          queryKey: key,
          assistantMessageId: response.assistantMessageId,
          event: {
            type: 'error',
            code: 'PROVIDER_ERROR',
            message: 'Stream request failed',
          },
        });
      } finally {
        streamControllersRef.current.delete(streamController);
        await syncMessagesAfterStream({
          queryClient,
          queryKey: key,
        });
      }
    },
  });
}

export function useStartConsultation(chatId: string) {
  const queryClient = useQueryClient();
  const userId = useSessionStore(state => state.user?.id);
  const key = queryKeys.chats.messages(userId ?? 'anonymous', chatId);
  const streamControllersRef = useRef(new Set<AbortController>());

  useEffect(() => {
    const streamControllers = streamControllersRef.current;
    return () => {
      streamControllers.forEach(controller => controller.abort());
      streamControllers.clear();
    };
  }, []);

  return useMutation({
    mutationFn: async (args: { prediction: string; confidence: number }) => {
      console.log('[useStartConsultation] Starting consultation payload:', { chatId, ...args });
      return startConsultation({
        chatId,
        prediction: args.prediction,
        confidence: args.confidence,
      });
    },
    onMutate: async (args) => {
      console.log('[useStartConsultation] onMutate started. Canceling active queries...');
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<InfiniteData<PaginatedMessages>>(key);

      const tempUserId = `temp_user_${generateIdempotencyKey()}`;
      const tempAssistantId = `temp_assistant_${generateIdempotencyKey()}`;

      queryClient.setQueryData<InfiniteData<PaginatedMessages> | undefined>(key, current =>
        updateMessagesCache(current, messages => [
          createOptimisticMessage({
            id: tempAssistantId,
            localKey: tempAssistantId,
            chatId,
            role: 'assistant',
            content: '',
            status: 'streaming',
          }),
          createOptimisticMessage({
            id: tempUserId,
            localKey: tempUserId,
            chatId,
            role: 'user',
            content: `Analyzing retinal scan prediction: ${args.prediction}`,
            status: 'pending',
          }),
          ...messages,
        ])
      );

      return { previous, tempUserId, tempAssistantId };
    },
    onError: (error, _content, context) => {
      console.error('[useStartConsultation] mutation failed:', error);
      if (!context) return;
      queryClient.setQueryData<InfiniteData<PaginatedMessages> | undefined>(key, context.previous ?? undefined);
    },
    onSuccess: async (response, _content, context) => {
      console.log('[useStartConsultation] Successful start response:', JSON.stringify(response));
      if (!context) return;

      if (!response?.assistantMessageId || !response?.userMessage) {
        console.error('[useStartConsultation] Invalid response:', response);
        await syncMessagesAfterStream({
          queryClient,
          queryKey: key,
        });
        return;
      }

      queryClient.setQueryData<InfiniteData<PaginatedMessages> | undefined>(key, current =>
        updateMessagesCache(current, messages =>
          messages.map(message => {
            if (message.id === context.tempUserId) {
              return {
                ...response.userMessage,
                localKey: message.localKey ?? context.tempUserId,
                status: 'complete',
              };
            }
            if (message.id === context.tempAssistantId) {
              console.log('[useStartConsultation] temp assistant before replacement:', message);
              const replaced: ChatMessage = {
                ...message,
                id: response.assistantMessageId,
                chatId: response.userMessage.chatId,
                createdAt: response.userMessage.createdAt,
                localKey: message.localKey ?? context.tempAssistantId,
                status: response.limitReached ? 'complete' : 'streaming',
                content: response.limitReached
                  ? 'Daily AI assistant limit reached. Please try again tomorrow.'
                  : message.content,
              };
              console.log('[useStartConsultation] assistant after replacement:', replaced);
              return replaced;
            }
            return message;
          })
        )
      );

      // If we did not hit limits, trigger SSE stream
      if (!response.limitReached) {
        const streamController = new AbortController();
        streamControllersRef.current.add(streamController);

        try {
          await runAssistantStream({
            chatId,
            assistantMessageId: response.assistantMessageId,
            queryClient,
            queryKey: key,
            signal: streamController.signal,
          });
        } catch (streamErr) {
          console.error('[useStartConsultation] Stream failed:', streamErr);
          updateAssistantMessageStatus({
            queryClient,
            queryKey: key,
            assistantMessageId: response.assistantMessageId,
            event: {
              type: 'error',
              code: 'PROVIDER_ERROR',
              message: 'Stream request failed',
            },
          });
        } finally {
          streamControllersRef.current.delete(streamController);
        }
      } else {
        await syncMessagesAfterStream({
          queryClient,
          queryKey: key,
        });
      }

      if (!response.limitReached) {
        await syncMessagesAfterStream({
          queryClient,
          queryKey: key,
        });
      }
    },
  });
}
