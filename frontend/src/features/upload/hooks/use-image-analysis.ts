import { useState, useCallback, useRef, useEffect } from 'react';
import * as Network from 'expo-network';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/store/session-store';
import { usePredictionStore } from '@/store/prediction-store';
import { useUploadWorkflowStore } from '../store/upload-workflow-store';
import { predictCataractFromImage } from '@/services/ai';
import { parseUploadError } from '@/utils/error-parser';
import { AppError } from '@/shared/errors/app-error';
import { NO_INTERNET_MESSAGE, type UploadPipelineErrorCode } from '@/shared/uploads/upload-errors';
import type { EyeImageInput } from '@/services/ai';

export function useImageAnalysis() {
  const user = useSessionStore(state => state.user);
  const router = useRouter();
  const queryClient = useQueryClient();

  const setPendingPrediction = usePredictionStore(state => state.setPending);
  const clearPendingPrediction = usePredictionStore(state => state.clearPending);

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

      if (isPredicting) {
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
        const networkState = await Network.getNetworkStateAsync();
        if (networkState.isConnected === false) {
          throw new AppError({
            message: NO_INTERNET_MESSAGE,
            code: 'NETWORK_ERROR',
            status: 0,
          });
        }

        const targetChatId = useUploadWorkflowStore.getState().chatId || undefined;
        const result = await predictCataractFromImage(image, targetChatId);
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
        setWorkflowCurrentProgressState('generating_Analysis');
        setWorkflowCurrentProgressState('preparing_report');

        // On success: check again before writing to global stores
        if (useUploadWorkflowStore.getState().flowId !== requestFlowId) {
          return;
        }

        const isChatOrigin = useUploadWorkflowStore.getState().origin === 'chat';

        setPendingPrediction({
          prediction: result.prediction,
          confidence: result.confidence,
          uploadedImageUrl: result.uploadedImageUrl,
          chatId: result.chatId,
          eyeValidation: result.eyeValidation,
        }, isChatOrigin);
        void queryClient.invalidateQueries({ queryKey: ['chats', 'list'] });

        setWorkflowCurrentProgressState('analysis_complete');

        // On success: clear error state and set uploadStatus to complete
        workflow.setLastErrorCode(null);
        setWorkflowUploadStatus('complete');

        if (mountedRef.current) {
          if (isChatOrigin) {
            router.replace('/(tabs)/chat' as never);
          } else {
            router.replace('/scan-result' as never);
          }
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
        if (
          parsedError.code === 'EYE_NOT_DETECTED' ||
          parsedError.code === 'INVALID_IMAGE' ||
          parsedError.code === 'UNSUPPORTED_FORMAT' ||
          parsedError.code === 'IMAGE_TOO_LARGE' ||
          parsedError.code === 'NO_INTERNET' ||
          parsedError.code === 'CROP_FAILED' ||
          parsedError.code === 'OPTIMIZATION_FAILED' ||
          parsedError.code === 'UPLOAD_FAILED' ||
          parsedError.code === 'AI_TIMEOUT' ||
          parsedError.code === 'ANALYSIS_FAILED'
        ) {
          workflowErrorCode = parsedError.code;
        } else if (parsedError.code === 'TIMEOUT') {
          workflowErrorCode = 'AI_TIMEOUT';
        } else if (parsedError.code === 'NETWORK_ERROR') {
          workflowErrorCode = 'NO_INTERNET';
        } else if (parsedError.code === 'SERVER_UNAVAILABLE') {
          workflowErrorCode = 'UPLOAD_FAILED';
        } else if (parsedError.code === 'FILE_TOO_LARGE') {
          workflowErrorCode = 'IMAGE_TOO_LARGE';
        } else if (parsedError.code === 'INVALID_REQUEST') {
          workflowErrorCode = 'INVALID_IMAGE';
        }

        clearPendingPrediction();
        workflow.setLastErrorCode(workflowErrorCode);
        setWorkflowUploadStatus('failed');
        setWorkflowCurrentProgressState('analysis_failed');

        if (mountedRef.current) {
          router.replace('/scan-result' as never);
        }
      } finally {
        const currentFlowId = useUploadWorkflowStore.getState().flowId;
        if (
          mountedRef.current &&
          predictionRequestIdRef.current === predictionRequestId &&
          (currentFlowId === requestFlowId || currentFlowId === null)
        ) {
          setIsPredicting(false);
        }
      }
    },
    [
      setPendingPrediction,
      clearPendingPrediction,
      setWorkflowCurrentProgressState,
      setWorkflowUploadStatus,
      workflow,
      user,
      router,
      queryClient,
      isPredicting,
    ],
  );

  return {
    isPredicting,
    analysisError: null,
    analyzeImage,
  };
}

