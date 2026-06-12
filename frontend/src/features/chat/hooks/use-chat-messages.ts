import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useSessionStore } from '@/features/auth/store/session-store';
import { listMessages } from '@/features/chat/api/chat-api';
import type { ChatMessage, PaginatedMessages } from '@/features/chat/types/chat-types';
import { queryKeys } from '@/shared/api/query-keys';

export function useChatMessages(chatId: string) {
  const accessToken = useSessionStore(state => state.accessToken);
  const userId = useSessionStore(state => state.user?.id);
  const hydrated = useSessionStore(state => state.hydrated);
  const canFetchMessages = hydrated && Boolean(accessToken) && Boolean(userId) && Boolean(chatId);

  const query = useInfiniteQuery<PaginatedMessages>({
    queryKey: queryKeys.chats.messages(userId ?? 'anonymous', chatId),
    queryFn: ({ pageParam }) => listMessages({ chatId, cursor: pageParam as string | undefined }),
    enabled: canFetchMessages,
    initialPageParam: undefined,
    getNextPageParam: lastPage => {
      return lastPage.nextCursor ?? undefined;
    },
  });

  const messages: ChatMessage[] = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const seenIds = new Set<string>();

    const flattened = pages.flatMap(page => {
      const items = Array.isArray(page.items) ? page.items : [];
      return items;
    });

    return flattened
      .filter((item): item is ChatMessage => {
        if (!item || typeof item !== 'object' || !item.id) {
          return false;
        }

        if (item.role === 'system') {
          return false;
        }

        if (
          item.role === 'assistant' &&
          item.status === 'complete' &&
          typeof item.content === 'string' &&
          item.content.trim().length === 0 &&
          !item.type
        ) {
          return false;
        }

        const dedupeKey = item.localKey ?? item.id;
        if (seenIds.has(dedupeKey)) {
          return false;
        }

        seenIds.add(dedupeKey);
        return true;
      })
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [query.data?.pages]);

  return { ...query, messages };
}
