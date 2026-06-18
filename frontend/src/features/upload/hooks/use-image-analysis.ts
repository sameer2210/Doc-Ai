import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';

import { useSessionStore } from '@/features/auth/store/session-store';
import { usePredictionStore } from '@/store/prediction-store';
import { useChatStore } from '@/features/chat/store/chat-store';
import { useUploadWorkflowStore } from '../store/upload-workflow-store';
import { predictCataractFromImage } from '@/services/ai';
import { parseUploadError } from '@/utils/error-parser';
import type { EyeImageInput } from '@/services/ai';
import type { UploadPipelineErrorCode } from '@/shared/uploads/upload-errors';

export function useImageAnalysis() {
  const user = useSessionStore(state => state.user);
  const router = useRouter();

  const setPendingPrediction = usePredictionStore(state => state.setPending);
  const clearPendingPrediction = usePredictionStore(state => state.clearPending);
  const setActiveChatId = useChatStore(state => state.setActiveChatId);

  const workflow = useUploadWorkflowStore(state => state);
  const setWorkflowUploadStatus = useUploadWorkflowStore(state => state.setUploadStatus);
  const setWorkflowCurrentProgressState = useUploadWorkflowStore(
    state => state.setCurrentProgressState,
  );

  const [isPredicting, setIsPredicting] = useState(false);

  const mountedRef = useRef(true);
  const predictionRequestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const analyzeImage = useCallback(
    async (image: EyeImageInput) => {
      if (!user) {
        if (mountedRef.current) {
          router.push('/login' as never);
        }
        return;
      }

      const predictionRequestId = predictionRequestIdRef.current + 1;
      predictionRequestIdRef.current = predictionRequestId;
      const requestFlowId = useUploadWorkflowStore.getState().flowId;
      
      clearPendingPrediction();
      setIsPredicting(true);
      
      // Before new analysis, clear previous error state and set to processing
      workflow.setLastErrorCode(null);
      setWorkflowUploadStatus('processing');
      setWorkflowCurrentProgressState('connecting_ai_engine');

      try {
        const result = await predictCataractFromImage(image);
        if (
          predictionRequestIdRef.current !== predictionRequestId ||
          useUploadWorkflowStore.getState().flowId !== requestFlowId
        ) {
          return;
        }

        if (!result.chatId) {
          throw new Error('Prediction response missing chatId');
        }

        setWorkflowCurrentProgressState('analyzing_eye');
        setWorkflowCurrentProgressState('generating_diagnosis');
        setWorkflowCurrentProgressState('preparing_report');

        // On success: check again before writing to global stores
        if (useUploadWorkflowStore.getState().flowId !== requestFlowId) {
          return;
        }

        setPendingPrediction({
          prediction: result.prediction,
          confidence: result.confidence,
          uploadedImageUrl: result.uploadedImageUrl,
          chatId: result.chatId,
        });
        setActiveChatId(result.chatId);

        setWorkflowCurrentProgressState('analysis_complete');
        
        // On success: clear error state and set uploadStatus to complete
        workflow.setLastErrorCode(null);
        setWorkflowUploadStatus('complete');
        
        if (mountedRef.current) {
          router.replace('/scan-result' as never);
        }
      } catch (error: unknown) {
        if (
          predictionRequestIdRef.current !== predictionRequestId ||
          useUploadWorkflowStore.getState().flowId !== requestFlowId
        ) {
          return;
        }

        const parsedError = parseUploadError(error);

        let workflowErrorCode: UploadPipelineErrorCode = 'ANALYSIS_FAILED';
        if (parsedError.code === 'TIMEOUT') {
          workflowErrorCode = 'AI_TIMEOUT';
        } else if (parsedError.code === 'NETWORK_ERROR' || parsedError.code === 'SERVER_UNAVAILABLE') {
          workflowErrorCode = 'UPLOAD_FAILED';
        } else if (parsedError.code === 'FILE_TOO_LARGE') {
          workflowErrorCode = 'IMAGE_TOO_LARGE';
        } else if (parsedError.code === 'NO_INTERNET') {
          workflowErrorCode = 'NO_INTERNET';
        }

        clearPendingPrediction();
        workflow.setLastErrorCode(workflowErrorCode);
        setWorkflowUploadStatus('failed');
        setWorkflowCurrentProgressState('analysis_failed');

        if (mountedRef.current) {
          router.replace('/scan-result' as never);
        }
      } finally {
        if (
          mountedRef.current &&
          predictionRequestIdRef.current === predictionRequestId &&
          useUploadWorkflowStore.getState().flowId === requestFlowId
        ) {
          setIsPredicting(false);
        }
      }
    },
    [
      setPendingPrediction,
      clearPendingPrediction,
      setActiveChatId,
      setWorkflowCurrentProgressState,
      setWorkflowUploadStatus,
      workflow,
      user,
      router,
    ],
  );

  return {
    isPredicting,
    analysisError: null,
    analyzeImage,
  };
}
