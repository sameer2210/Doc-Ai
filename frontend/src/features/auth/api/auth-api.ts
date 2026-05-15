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
