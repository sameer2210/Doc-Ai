import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';

import { useSessionStore } from '@/features/auth/store/session-store';
import { usePredictionStore } from '@/store/prediction-store';
import { useChatStore } from '@/features/chat/store/chat-store';
import { useUploadWorkflowStore } from '../store/upload-workflow-store';
import { predictCataractFromImage } from '@/services/ai';
import { parseUploadError } from '@/utils/error-parser';
import type { EyeImageInput } from '@/services/ai';

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
  const clearWorkflow = useUploadWorkflowStore(state => state.clearWorkflow);

  const [isPredicting, setIsPredicting] = useState(false);
  const [analysisError, setAnalysisError] = useState<{
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  const mountedRef = useRef(true);
  const predictionRequestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      predictionRequestIdRef.current += 1;
    };
  }, []);

  const analyzeImage = useCallback(
    async (image: EyeImageInput) => {
      if (!user) {
        setAnalysisError({
          title: 'Login required',
          message: 'Please login to run cataract detection.',
          actionLabel: 'Login',
          onAction: () => router.push('/login' as never),
        });
        return;
      }

      setAnalysisError(null);
      const predictionRequestId = predictionRequestIdRef.current + 1;
      predictionRequestIdRef.current = predictionRequestId;
      
      clearPendingPrediction();
      setIsPredicting(true);
      
      setWorkflowUploadStatus('processing');
      setWorkflowCurrentProgressState('connecting_ai_engine');

      try {
        const result = await predictCataractFromImage(image);
        if (!mountedRef.current || predictionRequestIdRef.current !== predictionRequestId) {
          return;
        }

        if (!result.chatId) {
          throw new Error('Prediction response missing chatId');
        }

        setWorkflowCurrentProgressState('analyzing_eye');
        setWorkflowCurrentProgressState('generating_diagnosis');
        setWorkflowCurrentProgressState('preparing_report');

        setPendingPrediction({
          prediction: result.prediction,
          confidence: result.confidence,
          uploadedImageUrl: result.uploadedImageUrl,
          chatId: result.chatId,
        });
        setActiveChatId(result.chatId);

        setWorkflowCurrentProgressState('analysis_complete');
        setWorkflowUploadStatus('complete');
        
        // Navigate to result screen instead of chat screen
        router.replace('/scan-result' as never);
        clearWorkflow();
      } catch (error: unknown) {
        if (!mountedRef.current || predictionRequestIdRef.current !== predictionRequestId) {
          return;
        }

        const parsedError = parseUploadError(error);

        setAnalysisError({
          title: 'Analysis failed',
          message: parsedError.message,
        });

        clearPendingPrediction();
        setWorkflowUploadStatus('failed');
        setWorkflowCurrentProgressState('analysis_complete');
        clearWorkflow();
      } finally {
        if (mountedRef.current && predictionRequestIdRef.current === predictionRequestId) {
          setIsPredicting(false);
        }
      }
    },
    [
      clearWorkflow,
      setPendingPrediction,
      clearPendingPrediction,
      setActiveChatId,
      setWorkflowCurrentProgressState,
      setWorkflowUploadStatus,
      user,
      router,
    ],
  );

  return {
    isPredicting,
    analysisError,
    analyzeImage,
  };
}
