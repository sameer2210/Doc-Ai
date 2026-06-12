import { useEffect, useRef } from 'react';
import { usePredictionStore } from '@/store/prediction-store';
import { useStartConsultation } from '@/features/chat/hooks/use-send-message';

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

    console.log('[useConsultationTrigger] Auto-triggering consultation for prediction:', pending.prediction);
    hasSentRef.current = true;

    startConsultationMutation.mutate(
      { prediction: pending.prediction, confidence: pending.confidence },
      {
        onSuccess: () => {
          console.log('[useConsultationTrigger] Consultation started successfully');
          clearPending();
          clearAttachments();
          setChatError(null);
        },
        onError: error => {
          console.error('[useConsultationTrigger] Consultation auto-start failed:', error);
          // Keep the prediction so user can retry manually, but do NOT reset hasSentRef.current to false.
          // This prevents the infinite automatic retry loop.
          setChatError(error);
        },
      }
    );
  }, [pending, activeChatId, startConsultationMutation, clearPending, clearAttachments, setChatError]);

  const handleRetryConsultation = () => {
    if (!pending) return;

    console.log('[useConsultationTrigger] Manual retry triggered for prediction:', pending.prediction);
    setChatError(null);
    startConsultationMutation.reset();

    startConsultationMutation.mutate(
      { prediction: pending.prediction, confidence: pending.confidence },
      {
        onSuccess: () => {
          console.log('[useConsultationTrigger] Consultation started successfully via manual retry');
          clearPending();
          clearAttachments();
          setChatError(null);
        },
        onError: error => {
          console.error('[useConsultationTrigger] Consultation manual retry failed:', error);
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
