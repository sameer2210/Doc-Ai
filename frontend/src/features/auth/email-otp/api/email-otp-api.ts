import { httpClient } from '@/shared/api/http-client';
import type {
  RequestOtpPayload,
  RequestOtpResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
} from '../types';

type ApiEnvelope<T> = {
  data?: ApiEnvelope<T> | T;
};

function unwrap<T>(body: unknown): T {
  const envelope = body as ApiEnvelope<T> | undefined;
  const levelOne = envelope?.data;
  const levelTwo = (levelOne as ApiEnvelope<T> | undefined)?.data;
  return (levelTwo ?? levelOne ?? body) as T;
}

export async function requestOtp(payload: RequestOtpPayload): Promise<RequestOtpResponse> {
  const response = await httpClient.post<unknown>('/auth/email/request-otp', payload);
  return unwrap<RequestOtpResponse>(response.data);
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
  const response = await httpClient.post<unknown>('/auth/email/verify-otp', payload);
  return unwrap<VerifyOtpResponse>(response.data);
}
