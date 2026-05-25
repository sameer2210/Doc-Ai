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
  setPending: (result: PredictionResult) => void;
  clearPending: () => void;
};

/**
 * Holds the most recent ML cataract prediction result so the
 * Chat screen can auto-send it as an Ayurvedic consultation request
 * via Gemini.
 */
export const usePredictionStore = create<PredictionState>(set => ({
  pending: null,
  setPending: result => set({ pending: result }),
  clearPending: () => set({ pending: null }),
}));
