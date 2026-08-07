import { Platform } from 'react-native';

import { httpClient } from '@/shared/api/http-client';
import { normalizeUploadImageMimeType } from '@/shared/uploads/upload-validation';
import type { EyeValidationResult } from '@/shared/types/eye-validation';

export type EyeImageInput = {
  uri: string;
  name: string;
  mimeType: string;
};

export type CataractPredictionResult = {
  prediction: string;
  confidence: number;
  uploadedImageUrl: string;
  chatId: string;
  eyeValidation?: EyeValidationResult;
  id?: string;
  aiProvider?: string;
  modelVersion?: string;
  createdAt?: string;
};

type PredictResponse = {
  success: boolean;
  data: CataractPredictionResult;
  message: string;
};

type NestedPredictEnvelope = {
  data?: NestedPredictEnvelope | CataractPredictionResult;
};

function isPredictionResult(value: unknown): value is CataractPredictionResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CataractPredictionResult>;
  return (
    typeof candidate.prediction === 'string' &&
    typeof candidate.confidence === 'number' &&
    typeof candidate.chatId === 'string'
  );
}

function unwrapPredictPayload(body: unknown): CataractPredictionResult {
  // Handles:
  // 1) direct payload
  // 2) controller envelope: { success, data, message }
  // 3) global interceptor envelope: { requestId, statusCode, ..., data: <controller envelope> }
  const envelope = body as NestedPredictEnvelope | undefined;
  const levelOne = envelope?.data;
  const levelTwo = (levelOne as NestedPredictEnvelope | undefined)?.data;
  const levelThree = (levelTwo as NestedPredictEnvelope | undefined)?.data;
  const candidate = levelThree ?? levelTwo ?? levelOne ?? body;

  if (!isPredictionResult(candidate)) {
    throw new Error('Prediction response payload is malformed.');
  }

  return candidate;
}

export async function predictCataractFromImage(
  input: EyeImageInput,
  chatId?: string
): Promise<CataractPredictionResult> {
  const formData = new FormData();
  const normalizedMimeType = normalizeUploadImageMimeType(input.mimeType) ?? 'image/jpeg';

  if (Platform.OS === 'web') {
    const fileResponse = await fetch(input.uri);
    const blob = await fileResponse.blob();
    formData.append('file', blob, input.name);
  } else {
    formData.append('file', {
      uri: input.uri,
      name: input.name,
      type: normalizedMimeType,
    });
  }

  if (chatId) {
    formData.append('chatId', chatId);
  }

  const response = await httpClient.post<PredictResponse>('/ai/predict', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const payload = unwrapPredictPayload(response.data as PredictResponse);

  return payload;
}
