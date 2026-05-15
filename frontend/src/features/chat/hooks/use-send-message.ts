import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { sendMessage, streamAssistantMessage } from '@/features/chat/api/chat-api';
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
  if (!previous) {
    return previous;
  }

  return {
    pageParams: previous.pageParams,
    pages: previous.pages.map((page, index) => {
      if (index === 0) {
        return {
          ...page,
          items: updater(page.items),
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
      return sendMessage({
        chatId,
        content: args.content,
        attachments: args.attachments,
        idempotencyKey,
      });
    },
    onMutate: async (args: { content: string; attachments?: ChatMessage['attachments'] }) => {
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
    onError: (_error, _content, context) => {
      if (!context) {
        return;
      }

      queryClient.setQueryData<InfiniteData<PaginatedMessages> | undefined>(
        key,
        context.previous ?? undefined
      );
    },
    onSuccess: async (response, _content, context) => {
      if (!context) {
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
                status: 'streaming',
              };
            }
            return message;
          })
        )
      );

      try {
        await streamAssistantMessage({
          chatId,
          assistantMessageId: response.assistantMessageId,
          onEvent: event => {
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
      } catch {
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
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
