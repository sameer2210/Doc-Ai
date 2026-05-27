import { httpClient } from '@/shared/api/http-client';
import type { RefreshTokenResponse } from '../types/auth-types';

/** Smart unwrap — handles both raw and ResponseInterceptor-wrapped responses */
function unwrap(body: any) {
  if (body?.accessToken) return body;
  if (body?.data?.accessToken) return body.data;
  if (body?.data?.data?.accessToken) return body.data.data;
  return body?.data ?? body;
}

export async function loginWithGoogle(idToken: string, providerAccessToken?: string) {
  const response = await httpClient.post('/auth/google', { idToken, providerAccessToken });
  return unwrap(response.data);
}

export async function loginWithEmail(email: string, password: string) {
  const response = await httpClient.post('/auth/login', { email, password });
  return unwrap(response.data);
}

export async function registerWithEmail(name: string, email: string, password: string) {
  const response = await httpClient.post('/auth/register', { name, email, password });
  return unwrap(response.data);
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
  // Sends refreshToken in JSON body — no cookies needed
  const response = await httpClient.post<any>(
    '/auth/refresh',
    { refreshToken },
    {
      _skipAuthRefresh: true,
      _skipAuthHeader: true,
    }
  );
  return unwrap(response.data);
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
