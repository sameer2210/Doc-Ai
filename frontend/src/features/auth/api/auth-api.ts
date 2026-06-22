import { httpClient } from '@/shared/api/http-client';
import type { AuthSession, RefreshTokenResponse } from '../types/auth-types';

type ApiEnvelope<T> = {
  data?: ApiEnvelope<T> | T;
};

function unwrap<T>(body: unknown): T {
  const envelope = body as ApiEnvelope<T> | undefined;
  const levelOne = envelope?.data;
  const levelTwo = (levelOne as ApiEnvelope<T> | undefined)?.data;
  return (levelTwo ?? levelOne ?? body) as T;
}

export async function loginWithGoogle(idToken: string, providerAccessToken?: string): Promise<AuthSession> {
  const response = await httpClient.post<unknown>('/auth/google', { idToken, providerAccessToken });
  return unwrap<AuthSession>(response.data);
}

export async function loginWithEmail(email: string, password: string): Promise<AuthSession> {
  const response = await httpClient.post<unknown>('/auth/login', { email, password });
  return unwrap<AuthSession>(response.data);
}

export async function registerWithEmail(name: string, email: string, password: string): Promise<AuthSession> {
  const response = await httpClient.post<unknown>('/auth/register', { name, email, password });
  return unwrap<AuthSession>(response.data);
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
  const response = await httpClient.post<unknown>(
    '/auth/refresh',
    { refreshToken },
    {
      _skipAuthRefresh: true,
      _skipAuthHeader: true,
    }
  );
  return unwrap<RefreshTokenResponse>(response.data);
}

export async function logoutMobile(refreshToken: string | null | undefined): Promise<void> {
  if (!refreshToken?.trim()) {
    return;
  }

  await httpClient.post(
    '/auth/logout/mobile',
    { refreshToken },
    {
      _skipAuthRefresh: true,
      _skipAuthHeader: true,
    }
  );
}

export async function deleteAccountAPI(): Promise<{ success: boolean }> {
  const response = await httpClient.delete<unknown>('/user/me');
  return unwrap<{ success: boolean }>(response.data);
}
