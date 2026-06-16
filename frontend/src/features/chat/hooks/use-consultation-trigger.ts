import { useStartConsultation } from '@/features/chat/hooks/use-send-message';
import { usePredictionStore } from '@/store/prediction-store';
import { useEffect, useRef } from 'react';

interface UseConsultationTriggerArgs {
  activeChatId: string;
  clearAttachments: () => void;
  setChatError: (error: unknown) => void;
}

export function useConsultationTrigger({
  activeChatId,
  clearAttachments,
  setChatError,
}: UseConsultationTriggerArgs) {
  const pending = usePredictionStore(state => state.pending);
  const clearPending = usePredictionStore(state => state.clearPending);
  const startConsultationMutation = useStartConsultation(activeChatId);

  const hasSentRef = useRef(false);

  // Reset sentinel ONLY when a new prediction result comes in
  useEffect(() => {
    if (pending) {
      hasSentRef.current = false;
    }
  }, [pending]);

  // Auto-send once per prediction result
  useEffect(() => {
    if (!pending || hasSentRef.current || startConsultationMutation.isPending) return;

    hasSentRef.current = true;

    startConsultationMutation.mutate(
      { prediction: pending.prediction, confidence: pending.confidence },
      {
        onSuccess: () => {
          clearPending();
          clearAttachments();
          setChatError(null);
        },
        onError: error => {
          setChatError(error);
        },
      }
    );
  }, [
    pending,
    activeChatId,
    startConsultationMutation,
    clearPending,
    clearAttachments,
    setChatError,
  ]);

  const handleRetryConsultation = () => {
    if (!pending) return;

    setChatError(null);
    startConsultationMutation.reset();

    startConsultationMutation.mutate(
      { prediction: pending.prediction, confidence: pending.confidence },
      {
        onSuccess: () => {
          clearPending();
          clearAttachments();
          setChatError(null);
        },
        onError: error => {
          setChatError(error);
        },
      }
    );
  };

  return {
    startConsultationMutation,
    handleRetryConsultation,
  };
}
