import { useInfiniteQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/store/session-store';
import { listMessages } from '@/features/chat/api/chat-api';
import type { ChatMessage, PaginatedMessages } from '@/features/chat/types/chat-types';
import { queryKeys } from '@/shared/api/query-keys';

export function useChatMessages(chatId: string) {
  const accessToken = useSessionStore(state => state.accessToken);
  const userId = useSessionStore(state => state.user?.id);
  const hydrated = useSessionStore(state => state.hydrated);
  const canFetchMessages = hydrated && Boolean(accessToken) && Boolean(userId) && Boolean(chatId);
  const tokenPreview = accessToken ? `${accessToken.slice(0, 8)}...` : 'none';

  console.log('[useChatMessages] Query gate:', {
    hydrated,
    hasAccessToken: Boolean(accessToken),
    userId: userId ?? null,
    tokenPreview,
    chatId,
    canFetchMessages,
  });

  const query = useInfiniteQuery<PaginatedMessages>({
    queryKey: queryKeys.chats.messages(userId ?? 'anonymous', chatId),
    queryFn: ({ pageParam }) => {
      console.log(`[useChatMessages] Fetching page with pageParam:`, pageParam);
      return listMessages({ chatId, cursor: pageParam as string | undefined });
    },
    enabled: canFetchMessages,
    initialPageParam: undefined,
    getNextPageParam: lastPage => {
      const next = lastPage.nextCursor ?? undefined;
      console.log(`[useChatMessages] getNextPageParam determined next cursor:`, next);
      return next;
    },
  });

  if (query.data) {
    console.log('[useChatMessages] Raw query.data.pages:', JSON.stringify(query.data.pages));
  }

  const messages: ChatMessage[] = query.data
    ? query.data.pages
        .flatMap(page => {
          const items = page.items;
          if (!Array.isArray(items)) {
            console.warn('[useChatMessages] Warning: page items is not an array:', page);
            return [];
          }
          return items;
        })
        .filter((item): item is ChatMessage => {
          if (!item || typeof item !== 'object' || !item.id) {
            console.error('[useChatMessages] ERROR: Invalid message item:', item);
            return false;
          }
          // Hide system role messages (internal use only)
          if (item.role === 'system') {
            return false;
          }
          // Hide stale empty assistant placeholders from failed streams
          if (
            item.role === 'assistant' &&
            item.status === 'complete' &&
            typeof item.content === 'string' &&
            item.content.trim().length === 0 &&
            !item.type // keep scan_result cards even if content is empty
          ) {
            return false;
          }
          return true;
        })
        .reverse()
    : []; 

  console.log(`[useChatMessages] Formatted messages list (total: ${messages.length}):`, messages);

  console.log(
    '[ChatOrder]',
    messages.map(m => ({
      id: m.id,
      role: m.role,
      createdAt: m.createdAt,
    }))
  );

  return { ...query, messages };
}
