import { useStartConsultation } from '@/features/chat/hooks/use-send-message';
import { usePredictionStore } from '@/store/prediction-store';
import { useUploadWorkflowStore } from '@/features/upload/store/upload-workflow-store';
import { useEffect } from 'react';

interface UseConsultationTriggerArgs {
  activeChatId: string;
  setChatError: (error: unknown) => void;
  clearAttachments?: () => void;
}

export function useConsultationTrigger({
  activeChatId,
  setChatError,
  clearAttachments,
}: UseConsultationTriggerArgs) {
  const pending = usePredictionStore(state => state.pending);
  const shouldAutoConsult = usePredictionStore(state => state.shouldAutoConsult);
  const isConsultationTriggered = usePredictionStore(state => state.isConsultationTriggered);
  const setConsultationTriggered = usePredictionStore(state => state.setConsultationTriggered);
  const clearPending = usePredictionStore(state => state.clearPending);
  const startConsultationMutation = useStartConsultation(activeChatId);

  // Auto-send once per prediction result
  useEffect(() => {
    // Read live values from store to avoid closure race conditions across rapid renders
    const storeState = usePredictionStore.getState();
    const livePending = storeState.pending;
    const liveShouldAutoConsult = storeState.shouldAutoConsult;
    const liveIsTriggered = storeState.isConsultationTriggered;

    if (
      !livePending ||
      !liveShouldAutoConsult ||
      liveIsTriggered ||
      startConsultationMutation.isPending
    ) {
      return;
    }

    if (activeChatId !== livePending.chatId) {
      return;
    }

    // Set triggered to true synchronously in the store to block any other scheduled effects
    setConsultationTriggered(true);

    startConsultationMutation.mutate(
      { prediction: livePending.prediction, confidence: livePending.confidence },
      {
        onSuccess: () => {
          clearPending();
          useUploadWorkflowStore.getState().clearWorkflow();
          setChatError(null);
          clearAttachments?.();
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
    clearAttachments,
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
          clearAttachments?.();
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
