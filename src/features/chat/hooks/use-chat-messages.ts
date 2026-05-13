import { useInfiniteQuery } from '@tanstack/react-query';

import { listMessages } from '@/features/chat/api/chat-api';
import type { ChatMessage, PaginatedMessages } from '@/features/chat/types/chat-types';
import { queryKeys } from '@/shared/api/query-keys';

export function useChatMessages(chatId: string) {
  const query = useInfiniteQuery<PaginatedMessages>({
    queryKey: queryKeys.chats.messages(chatId),
    queryFn: ({ pageParam }) => listMessages({ chatId, cursor: pageParam as string | undefined }),
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  });

  const messages: ChatMessage[] = query.data
    ? query.data.pages.flatMap(page => page.items)
    : [];

  return { ...query, messages };
}
