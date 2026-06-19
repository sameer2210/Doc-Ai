import { useStartConsultation } from '@/features/chat/hooks/use-send-message';
import { usePredictionStore } from '@/store/prediction-store';
import { useUploadWorkflowStore } from '@/features/upload/store/upload-workflow-store';
import { useEffect } from 'react';

interface UseConsultationTriggerArgs {
  activeChatId: string;
  setChatError: (error: unknown) => void;
}

export function useConsultationTrigger({
  activeChatId,
  setChatError,
}: UseConsultationTriggerArgs) {
  const pending = usePredictionStore(state => state.pending);
  const shouldAutoConsult = usePredictionStore(state => state.shouldAutoConsult);
  const isConsultationTriggered = usePredictionStore(state => state.isConsultationTriggered);
  const setConsultationTriggered = usePredictionStore(state => state.setConsultationTriggered);
  const clearPending = usePredictionStore(state => state.clearPending);
  const startConsultationMutation = useStartConsultation(activeChatId);

  // Auto-send once per prediction result
  useEffect(() => {
    if (
      !pending ||
      !shouldAutoConsult ||
      isConsultationTriggered ||
      startConsultationMutation.isPending
    ) {
      return;
    }

    // Set triggered to true immediately before executing mutate to prevent duplicate runs
    setConsultationTriggered(true);

    startConsultationMutation.mutate(
      { prediction: pending.prediction, confidence: pending.confidence },
      {
        onSuccess: () => {
          clearPending();
          useUploadWorkflowStore.getState().clearWorkflow();
          setChatError(null);
        },
        onError: error => {
          setConsultationTriggered(false); // Reset to allow retry
          setChatError(error);
        },
      }
    );
  }, [
    pending,
    shouldAutoConsult,
    isConsultationTriggered,
    activeChatId,
    startConsultationMutation,
    clearPending,
    setConsultationTriggered,
    setChatError,
  ]);

  const handleRetryConsultation = () => {
    if (!pending) return;

    setChatError(null);
    startConsultationMutation.reset();

    setConsultationTriggered(true);

    startConsultationMutation.mutate(
      { prediction: pending.prediction, confidence: pending.confidence },
      {
        onSuccess: () => {
          clearPending();
          useUploadWorkflowStore.getState().clearWorkflow();
          setChatError(null);
        },
        onError: error => {
          setConsultationTriggered(false); // Reset to allow retry
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
