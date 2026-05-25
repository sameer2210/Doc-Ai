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
  setPending: (result: PredictionResult) => void;
  setActiveChatId: (chatId: string | null) => void;
  clearPending: () => void;
};

/**
 * Holds the most recent ML cataract prediction result so the
 * Chat screen can auto-send it as an Ayurvedic consultation request
 * via Gemini.
 */
export const usePredictionStore = create<PredictionState>(set => ({
  pending: null,
  activeChatId: null,
  setPending: result => set({ pending: result, activeChatId: result.chatId }),
  setActiveChatId: chatId => set({ activeChatId: chatId }),
  clearPending: () => set({ pending: null }),
}));
