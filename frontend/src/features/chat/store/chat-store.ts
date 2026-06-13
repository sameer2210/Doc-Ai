import { create } from 'zustand';

type ChatState = {
  activeChatId: string | null;
  setActiveChatId: (chatId: string | null) => void;
  clearActiveChat: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  activeChatId: null,
  setActiveChatId: (chatId) => set({ activeChatId: chatId }),
  clearActiveChat: () => set({ activeChatId: null }),
}));
