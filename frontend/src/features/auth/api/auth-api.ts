import { create } from 'axios';
import { env } from '@/shared/config/env';
import type { RefreshTokenResponse } from '../types/auth-types';

// Plain axios client — no cookies, no withCredentials
// All auth via JSON body + Authorization: Bearer header
const authClient = create({
  baseURL: env.EXPO_PUBLIC_API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

/** Smart unwrap — handles both raw and ResponseInterceptor-wrapped responses */
function unwrap(body: any) {
  if (body?.accessToken) return body;
  if (body?.data?.accessToken) return body.data;
  if (body?.data?.data?.accessToken) return body.data.data;
  return body?.data ?? body;
}

export async function loginWithGoogle(idToken: string, providerAccessToken?: string) {
  const response = await authClient.post('/auth/google', { idToken, providerAccessToken });
  return unwrap(response.data);
}

export async function loginWithEmail(email: string, password: string) {
  const response = await authClient.post('/auth/login', { email, password });
  return unwrap(response.data);
}

export async function registerWithEmail(name: string, email: string, password: string) {
  const response = await authClient.post('/auth/register', { name, email, password });
  return unwrap(response.data);
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
  // Sends refreshToken in JSON body — no cookies needed
  const response = await authClient.post<any>('/auth/refresh', { refreshToken });
  return unwrap(response.data);
}
