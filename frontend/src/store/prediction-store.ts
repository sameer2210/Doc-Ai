import { create } from 'zustand';
import type { EyeValidationResult } from '@/shared/types/eye-validation';

export type PredictionResult = {
  prediction: string;
  confidence: number;
  uploadedImageUrl: string;
  /** The chat session where the consultation should happen */
  chatId: string;
  eyeValidation?: EyeValidationResult;
};

type PredictionState = {
  pending: PredictionResult | null;
  pendingMessage: string | null;
  shouldAutoConsult: boolean;
  isConsultationTriggered: boolean;
  setPending: (result: PredictionResult, shouldAutoConsult?: boolean) => void;
  setPendingMessage: (message: string | null) => void;
  setConsultationTriggered: (triggered: boolean) => void;
  clearPending: () => void;
  clearAll: () => void;
};

/**
 * Holds the most recent ML cataract prediction result so the
 * Chat screen can auto-send it as an Ayurvedic consultation request
 * via Gemini. Also supports home-to-chat text routing.
 */
export const usePredictionStore = create<PredictionState>(set => ({
  pending: null,
  pendingMessage: null,
  shouldAutoConsult: false,
  isConsultationTriggered: false,
  setPending: (result, shouldAutoConsult = false) =>
    set({ pending: result, shouldAutoConsult, isConsultationTriggered: false }),
  setPendingMessage: message => set({ pendingMessage: message }),
  setConsultationTriggered: triggered => set({ isConsultationTriggered: triggered }),
  clearPending: () => set({ pending: null, shouldAutoConsult: false, isConsultationTriggered: false }),
  clearAll: () => set({ pending: null, pendingMessage: null, shouldAutoConsult: false, isConsultationTriggered: false }),
}));
