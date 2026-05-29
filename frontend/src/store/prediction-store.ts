import { create } from 'zustand';

export type PredictionResult = {
  prediction: string;
  confidence: number;
  uploadedImageUrl: string;
  /** The chat session where the consultation should happen */
  chatId: string;
};

type PredictionState = {
  pending: PredictionResult | null;
  activeChatId: string | null;
  pendingMessage: string | null;
  setPending: (result: PredictionResult) => void;
  setActiveChatId: (chatId: string | null) => void;
  setPendingMessage: (message: string | null) => void;
  clearPending: () => void;
};

/**
 * Holds the most recent ML cataract prediction result so the
 * Chat screen can auto-send it as an Ayurvedic consultation request
 * via Gemini. Also supports home-to-chat text routing.
 */
export const usePredictionStore = create<PredictionState>(set => ({
  pending: null,
  activeChatId: null,
  pendingMessage: null,
  setPending: result => set({ pending: result, activeChatId: result.chatId }),
  setActiveChatId: chatId => set({ activeChatId: chatId }),
  setPendingMessage: message => set({ pendingMessage: message }),
  clearPending: () => set({ pending: null }),
}));
