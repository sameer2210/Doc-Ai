import { useInfiniteQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/store/session-store';
import { listMessages } from '@/features/chat/api/chat-api';
import type { ChatMessage } from '@/features/chat/types/chat-types';
import { queryKeys } from '@/shared/api/query-keys';

export function useChatMessages(chatId: string) {
  const accessToken = useSessionStore(state => state.accessToken);
  const hydrated = useSessionStore(state => state.hydrated);
  const canFetchMessages = hydrated && Boolean(accessToken) && Boolean(chatId);
  const tokenPreview = accessToken ? `${accessToken.slice(0, 8)}...` : 'none';

  console.log('[useChatMessages] Query gate:', {
    hydrated,
    hasAccessToken: Boolean(accessToken),
    tokenPreview,
    chatId,
    canFetchMessages,
  });

  const query = useInfiniteQuery<any>({
    queryKey: queryKeys.chats.messages(chatId),
    queryFn: ({ pageParam }) => {
      console.log(`[useChatMessages] Fetching page with pageParam:`, pageParam);
      return listMessages({ chatId, cursor: pageParam as string | undefined });
    },
    enabled: canFetchMessages,
    initialPageParam: undefined,
    getNextPageParam: (lastPage: any) => {
      const next = lastPage?.data?.nextCursor ?? lastPage?.nextCursor ?? undefined;
      console.log(`[useChatMessages] getNextPageParam determined next cursor:`, next);
      return next;
    },
  });

  if (query.data) {
    console.log('[useChatMessages] Raw query.data.pages:', JSON.stringify(query.data.pages));
  }

  const messages: ChatMessage[] = query.data
    ? query.data.pages
        .flatMap((page: any) => {
          const items = page?.data?.items ?? page?.items ?? [];
          if (!Array.isArray(items)) {
            console.warn('[useChatMessages] Warning: page items is not an array or is missing:', page);
            return [];
          }
          return items;
        })
        .filter((item: any) => {
          if (!item || typeof item !== 'object' || !item.id) {
            console.error('[useChatMessages] ERROR: Found an invalid message item in pages:', item);
            return false;
          }
          // Hide stale empty assistant placeholders persisted from failed stream attempts.
          if (
            item.role === 'assistant' &&
            item.status === 'complete' &&
            typeof item.content === 'string' &&
            item.content.trim().length === 0
          ) {
            return false;
          }
          return true;
        })
    : [];

  console.log(`[useChatMessages] Formatted messages list (total: ${messages.length}):`, messages);

  return { ...query, messages };
}
