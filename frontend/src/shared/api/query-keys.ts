export const queryKeys = {
  chats: {
    all: ['chats'] as const,
    detail: (chatId: string) => ['chats', chatId] as const,
    messages: (chatId: string) => ['chats', chatId, 'messages'] as const,
  },
};
