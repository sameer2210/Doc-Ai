import { create } from 'axios';

import type { RefreshTokenResponse } from '../types/auth-types';
import { env } from '@/shared/config/env';

const authClient = create({
  baseURL: env.EXPO_PUBLIC_API_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
  const response = await authClient.post<RefreshTokenResponse>('/auth/refresh', {
    refreshToken,
  });
  return response.data;
}

export async function loginWithGoogle(idToken: string, providerAccessToken?: string) {
  const response = await authClient.post('/auth/google', {
    idToken,
    providerAccessToken,
  });
  return response.data;
}

export async function loginWithEmail(email: string, password: string) {
  const response = await authClient.post('/auth/login', {
    email,
    password,
  });
  return response.data;
}
