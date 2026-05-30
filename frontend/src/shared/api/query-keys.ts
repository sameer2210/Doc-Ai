export const queryKeys = {
  chats: {
    all: (userId: string) => ['users', userId, 'chats'] as const,
    detail: (userId: string, chatId: string) => ['users', userId, 'chats', chatId] as const,
    messages: (userId: string, chatId: string) => ['users', userId, 'chats', chatId, 'messages'] as const,
  },
};
