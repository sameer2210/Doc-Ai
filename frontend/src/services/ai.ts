import { Platform } from 'react-native';

import { httpClient } from '@/shared/api/http-client';

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
  id?: string;
  patientId?: string | null;
  aiProvider?: string;
  modelVersion?: string;
  createdAt?: string;
};

type PredictResponse = {
  success: boolean;
  data: CataractPredictionResult;
  message: string;
};

function unwrapPredictPayload(body: any): CataractPredictionResult {
  // Handles:
  // 1) direct payload
  // 2) controller envelope: { success, data, message }
  // 3) global interceptor envelope: { requestId, statusCode, ..., data: <controller envelope> }
  const candidate =
    body?.data?.data?.data ??
    body?.data?.data ??
    body?.data ??
    body;

  return candidate as CataractPredictionResult;
}

export async function predictCataractFromImage(input: EyeImageInput): Promise<CataractPredictionResult> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const fileResponse = await fetch(input.uri);
    const blob = await fileResponse.blob();
    formData.append('file', blob, input.name);
  } else {
    // React Native FormData uses this object shape for file uploads.
    // @ts-expect-error React Native file upload object type
    formData.append('file', {
      uri: input.uri,
      name: input.name,
      type: input.mimeType,
    });
  }

  const response = await httpClient.post<PredictResponse>('/ai/predict', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const payload = unwrapPredictPayload(response.data as PredictResponse);
  console.log('[ai-service] predict response:', {
    prediction: payload?.prediction,
    confidence: payload?.confidence,
    chatId: payload?.chatId ?? null,
    uploadedImageUrl: payload?.uploadedImageUrl ?? null,
  });
  return payload;
}
