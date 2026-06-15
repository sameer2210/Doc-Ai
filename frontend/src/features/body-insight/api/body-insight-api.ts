import { httpClient } from '@/shared/api/http-client';
import type { BodyInsightProfile, UpsertBodyInsightPayload } from '../types';

type ApiEnvelope<T> = {
  data?: ApiEnvelope<T> | T;
};

function unwrapApiPayload<T>(body: unknown): T {
  const envelope = body as ApiEnvelope<T> | undefined;
  const levelOne = envelope?.data;
  const levelTwo = (levelOne as ApiEnvelope<T> | undefined)?.data;
  const levelThree = (levelTwo as ApiEnvelope<T> | undefined)?.data;
  return (levelThree ?? levelTwo ?? levelOne ?? body) as T;
}

export async function getBodyInsight(): Promise<BodyInsightProfile | null> {
  const response = await httpClient.get('/body-insight');
  return unwrapApiPayload<BodyInsightProfile | null>(response.data);
}

export async function upsertBodyInsight(
  payload: UpsertBodyInsightPayload,
): Promise<BodyInsightProfile> {
  const response = await httpClient.put('/body-insight', payload);
  return unwrapApiPayload<BodyInsightProfile>(response.data);
}
