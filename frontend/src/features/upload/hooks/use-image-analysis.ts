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
  const setWorkflowProgressPercent = useUploadWorkflowStore(
    state => state.setUploadProgressPercent,
  );

  const [isPredicting, setIsPredicting] = useState(false);

  const mountedRef = useRef(true);
  const predictionRequestIdRef = useRef(0);
  const orchestrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOrchestrationTimer = useCallback(() => {
    if (orchestrationTimerRef.current) {
      clearTimeout(orchestrationTimerRef.current);
      orchestrationTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearOrchestrationTimer();
    };
  }, [clearOrchestrationTimer]);

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
      clearOrchestrationTimer();
      setIsPredicting(true);

      // Before new analysis, clear previous error state and set to Stage 2: Uploading Scan
      workflow.setLastErrorCode(null);
      setWorkflowUploadStatus('processing');
      setWorkflowCurrentProgressState('uploading_image');
      setWorkflowProgressPercent(25);

      // Stage orchestrator: Transition to Stage 3 (Eye Alignment & AI Analysis) while HTTP request is pending
      orchestrationTimerRef.current = setTimeout(() => {
        if (
          mountedRef.current &&
          predictionRequestIdRef.current === predictionRequestId &&
          useUploadWorkflowStore.getState().flowId === requestFlowId
        ) {
          setWorkflowCurrentProgressState('connecting_ai_engine');
          setWorkflowProgressPercent(60);
        }
      }, 500);

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

        clearOrchestrationTimer();

        if (
          predictionRequestIdRef.current !== predictionRequestId ||
          useUploadWorkflowStore.getState().flowId !== requestFlowId
        ) {
          return;
        }

        if (!result.chatId) {
          throw new Error('Prediction response missing chatId');
        }

        // Transition Stage 4 to ACTIVE (◉ Report Generation)
        setWorkflowCurrentProgressState('generating_Analysis');
        setWorkflowProgressPercent(90);

        // 300ms active hold for Stage 4 so user visibly observes ◉ Report Generation
        await new Promise(resolve => setTimeout(resolve, 300));

        // On success: check again before writing to global stores
        if (
          !mountedRef.current ||
          predictionRequestIdRef.current !== predictionRequestId ||
          useUploadWorkflowStore.getState().flowId !== requestFlowId
        ) {
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

        // Transition Stage 4 to COMPLETED (✓ Report Generation)
        setWorkflowCurrentProgressState('analysis_complete');
        setWorkflowProgressPercent(100);
        workflow.setLastErrorCode(null);
        setWorkflowUploadStatus('complete');

        // 300ms full-completion hold so user visibly observes all 4 checkmarks green
        await new Promise(resolve => setTimeout(resolve, 300));

        if (
          mountedRef.current &&
          predictionRequestIdRef.current === predictionRequestId &&
          useUploadWorkflowStore.getState().flowId === requestFlowId
        ) {
          if (isChatOrigin) {
            router.replace('/(tabs)/chat' as never);
          } else {
            router.replace('/scan-result' as never);
          }
        }
      } catch (error: unknown) {
        clearOrchestrationTimer();

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

        // Short visual hold (300ms) on failure state
        await new Promise(resolve => setTimeout(resolve, 300));

        if (
          mountedRef.current &&
          predictionRequestIdRef.current === predictionRequestId
        ) {
          router.replace('/scan-result' as never);
        }
      } finally {
        clearOrchestrationTimer();
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
      setWorkflowProgressPercent,
      clearOrchestrationTimer,
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

