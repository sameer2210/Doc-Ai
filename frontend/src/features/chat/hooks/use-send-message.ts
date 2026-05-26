import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { sendMessage, startConsultation, streamAssistantMessage } from '@/features/chat/api/chat-api';
import type { ChatMessage, PaginatedMessages } from '@/features/chat/types/chat-types';
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
): InfiniteData<PaginatedMessages> | undefined {
  if (!previous || !Array.isArray(previous.pages)) {
    console.warn('[updateMessagesCache] Warning: previous data or previous.pages is invalid:', previous);
    return previous;
  }

  return {
    pageParams: previous.pageParams,
    pages: previous.pages.map((page, index) => {
      if (index === 0) {
        const items = Array.isArray(page?.items)
          ? page.items
          : Array.isArray((page as any)?.data?.items)
            ? (page as any).data.items
            : [];
        console.log(`[updateMessagesCache] Updating first page items. Current count: ${items.length}`);
        const nextItems = updater(items);
        console.log(`[updateMessagesCache] First page items updated. New count: ${nextItems.length}`);
        if (Array.isArray(page?.items)) {
          return {
            ...page,
            items: nextItems,
          };
        }
        if (Array.isArray((page as any)?.data?.items)) {
          return {
            ...(page as any),
            data: {
              ...(page as any).data,
              items: nextItems,
            },
          };
        }
        return {
          ...(page as any),
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

export function useSendMessage(chatId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.chats.messages(chatId);

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
          ...messages,
          createOptimisticMessage({
            id: tempUserId,
            chatId,
            role: 'user',
            content: args.content,
            status: 'pending',
            attachments: args.attachments,
          }),
          createOptimisticMessage({
            id: tempAssistantId,
            chatId,
            role: 'assistant',
            content: '',
            status: 'streaming',
          }),
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
        void queryClient.invalidateQueries({ queryKey: key });
        return;
      }

      console.log('[useSendMessage] Updating optimistic messages with actual message IDs...');
      queryClient.setQueryData<InfiniteData<PaginatedMessages> | undefined>(key, current =>
        updateMessagesCache(current, messages =>
          messages.map(message => {
            if (message.id === context.tempUserId) {
              return {
                ...response.userMessage,
                status: 'complete',
              };
            }
            if (message.id === context.tempAssistantId) {
              return {
                ...message,
                id: response.assistantMessageId,
                status: 'streaming',
              };
            }
            return message;
          })
        )
      );

      try {
        console.log('[useSendMessage] Starting streaming of assistant message with ID:', response.assistantMessageId);
        await streamAssistantMessage({
          chatId,
          assistantMessageId: response.assistantMessageId,
          onEvent: event => {
            console.log('[useSendMessage] Streaming event received:', event);
            queryClient.setQueryData<InfiniteData<PaginatedMessages> | undefined>(key, current =>
              updateMessagesCache(current, messages =>
                messages.map(message => {
                  if (message.id !== response.assistantMessageId) {
                    return message;
                  }

                  if (event.type === 'token') {
                    return {
                      ...message,
                      content: `${message.content}${event.value}`,
                      status: 'streaming',
                    };
                  }

                  if (event.type === 'error') {
                    console.error('[useSendMessage] Stream encountered error event:', event.message);
                    return {
                      ...message,
                      status: 'error',
                      content: message.content || event.message,
                    };
                  }

                  console.log('[useSendMessage] Stream completed for message ID:', response.assistantMessageId);
                  return {
                    ...message,
                    status: 'complete',
                  };
                })
              )
            );
          },
        });
      } catch (streamErr) {
        console.error('[useSendMessage] Stream processing failed:', streamErr);
        queryClient.setQueryData<InfiniteData<PaginatedMessages> | undefined>(key, current =>
          updateMessagesCache(current, messages =>
            messages.map(message =>
              message.id === response.assistantMessageId ? { ...message, status: 'error' } : message
            )
          )
        );
      }
    },
    onSettled: () => {
      console.log('[useSendMessage] Mutation settled. Invalidating query key:', key);
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useStartConsultation(chatId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.chats.messages(chatId);

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
          ...messages,
          createOptimisticMessage({
            id: tempUserId,
            chatId,
            role: 'user',
            content: `Analyzing retinal scan prediction: ${args.prediction}`,
            status: 'pending',
          }),
          createOptimisticMessage({
            id: tempAssistantId,
            chatId,
            role: 'assistant',
            content: '',
            status: 'streaming',
          }),
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
        void queryClient.invalidateQueries({ queryKey: key });
        return;
      }

      queryClient.setQueryData<InfiniteData<PaginatedMessages> | undefined>(key, current =>
        updateMessagesCache(current, messages =>
          messages.map(message => {
            if (message.id === context.tempUserId) {
              return {
                ...response.userMessage,
                status: 'complete',
              };
            }
            if (message.id === context.tempAssistantId) {
              return {
                ...message,
                id: response.assistantMessageId,
                status: response.limitReached ? 'complete' : 'streaming',
                content: response.limitReached ? response.userMessage.content : message.content,
              };
            }
            return message;
          })
        )
      );

      // If we did not hit limits, trigger SSE stream
      if (!response.limitReached) {
        try {
          await streamAssistantMessage({
            chatId,
            assistantMessageId: response.assistantMessageId,
            onEvent: event => {
              queryClient.setQueryData<InfiniteData<PaginatedMessages> | undefined>(key, current =>
                updateMessagesCache(current, messages =>
                  messages.map(message => {
                    if (message.id !== response.assistantMessageId) return message;

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

                    return {
                      ...message,
                      status: 'complete',
                    };
                  })
                )
              );
            },
          });
        } catch (streamErr) {
          console.error('[useStartConsultation] Stream failed:', streamErr);
          queryClient.setQueryData<InfiniteData<PaginatedMessages> | undefined>(key, current =>
            updateMessagesCache(current, messages =>
              messages.map(message =>
                message.id === response.assistantMessageId ? { ...message, status: 'error' } : message
              )
            )
          );
        }
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

