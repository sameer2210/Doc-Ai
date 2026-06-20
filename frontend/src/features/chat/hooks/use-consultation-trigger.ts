import { useStartConsultation } from '@/features/chat/hooks/use-send-message';
import { usePredictionStore } from '@/store/prediction-store';
import { useUploadWorkflowStore } from '@/features/upload/store/upload-workflow-store';
import { useEffect } from 'react';

console.log('[DEBUG FILE] use-consultation-trigger.ts loaded');

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
  console.log('[DEBUG HOOK] useConsultationTrigger called');
  const pending = usePredictionStore(state => state.pending);
  const shouldAutoConsult = usePredictionStore(state => state.shouldAutoConsult);
  const isConsultationTriggered = usePredictionStore(state => state.isConsultationTriggered);
  const setConsultationTriggered = usePredictionStore(state => state.setConsultationTriggered);
  const clearPending = usePredictionStore(state => state.clearPending);
  const startConsultationMutation = useStartConsultation(activeChatId);

  // Auto-send once per prediction result
  useEffect(() => {
    console.log('[DEBUG hook]', {
      pending,
      shouldAutoConsult,
      isConsultationTriggered,
      isPending: startConsultationMutation.isPending,
      activeChatId,
    });
    if (
      !pending ||
      !shouldAutoConsult ||
      isConsultationTriggered ||
      startConsultationMutation.isPending
    ) {
      console.log('[DEBUG hook] early return triggered');
      return;
    }

    console.log('[DEBUG hook] mutate being called');
    // Set triggered to true immediately before executing mutate to prevent duplicate runs
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
