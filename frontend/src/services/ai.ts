import { Platform } from 'react-native';

import { httpClient } from '@/shared/api/http-client';

export type EyeImageInput = {
  uri: string;
  name: string;
  mimeType: string;
};

export type CataractPredictionResult = {
  id: string;
  prediction: string;
  confidence: number;
  uploadedImageUrl: string;
  patientId: string | null;
  aiProvider: string;
  modelVersion: string;
  createdAt: string;
};

type PredictResponse = {
  success: boolean;
  data: CataractPredictionResult;
  message: string;
};

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

  return response.data.data;
}
