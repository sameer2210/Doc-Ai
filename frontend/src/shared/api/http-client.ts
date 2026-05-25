import {
  create,
  isAxiosError,
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { refreshAccessToken } from '@/features/auth/api/auth-api';
import { useSessionStore } from '@/features/auth/store/session-store';
import { clearPersistedSession, persistSession } from '@/shared/auth/token-storage';
import { env } from '@/shared/config/env';
import { AppError } from '@/shared/errors/app-error';

type RequestConfigWithRetry = InternalAxiosRequestConfig & { _retry?: boolean };

export const httpClient = create({
  baseURL: env.EXPO_PUBLIC_API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
  // No withCredentials — tokens travel in Authorization header, not cookies
});

let refreshPromise: Promise<string> | null = null;

function toAppError(error: unknown): AppError {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const message =
      error.response?.data?.data?.message ??
      error.response?.data?.message ??
      error.message ??
      'Unexpected error';

    if (!status) return new AppError({ message, code: 'NETWORK_ERROR', retryable: true });
    if (status === 401) return new AppError({ message, code: 'UNAUTHORIZED', status, retryable: false });
    if (status === 403) return new AppError({ message, code: 'FORBIDDEN', status, retryable: false });
    if (status === 404) return new AppError({ message, code: 'NOT_FOUND', status, retryable: false });
    if (status === 422) return new AppError({ message, code: 'VALIDATION_ERROR', status, retryable: false });
    if (status === 429) return new AppError({ message, code: 'RATE_LIMITED', status, retryable: true });
    if (status >= 500) return new AppError({ message, code: 'SERVER_ERROR', status, retryable: true });
  }

  return new AppError({
    message: error instanceof Error ? error.message : 'Unknown error',
    code: 'UNKNOWN_ERROR',
  });
}

// ─── Request Interceptor ─────────────────────────────────────────────────────
// Reads accessToken from Zustand (memory) and attaches as Bearer header
httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = useSessionStore.getState().accessToken;
  const url = config.url ?? '';
  const shouldLogAuth = url.includes('/chats/') || url.includes('/ai/predict');

  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (shouldLogAuth) {
    console.log('[http-client] Request auth:', {
      method: config.method,
      url,
      hasAccessToken: Boolean(accessToken),
      tokenPreview: accessToken ? `${accessToken.slice(0, 8)}...` : 'none',
      hydrated: useSessionStore.getState().hydrated,
    });
  }

  return config;
});

// ─── Response Interceptor ────────────────────────────────────────────────────
// On 401: reads refreshToken from Zustand, calls /auth/refresh with it in body,
// updates store + SecureStore with new tokens, then retries original request
httpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RequestConfigWithRetry | undefined;

    if (!originalRequest) throw toAppError(error);
    if (status !== 401 || originalRequest._retry) throw toAppError(error);

    console.warn('[http-client] 401 received. Attempting refresh flow.', {
      url: originalRequest.url,
      hasRefreshToken: Boolean(useSessionStore.getState().refreshToken),
      hydrated: useSessionStore.getState().hydrated,
    });

    originalRequest._retry = true;
    const sessionStore = useSessionStore.getState();

    // No refresh token in store → session is fully expired, force logout
    if (!sessionStore.refreshToken) {
      sessionStore.clearSession();
      await clearPersistedSession();
      throw toAppError(error);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken(sessionStore.refreshToken).then(async refreshed => {
          const nextAccessToken = refreshed.accessToken;
          const nextRefreshToken = refreshed.refreshToken ?? sessionStore.refreshToken!;
          const currentState = useSessionStore.getState();

          // Update Zustand memory
          currentState.setSession({
            accessToken: nextAccessToken,
            refreshToken: nextRefreshToken,
            user: currentState.user,
          });

          // Persist new tokens to SecureStore
          await persistSession({
            accessToken: nextAccessToken,
            refreshToken: nextRefreshToken,
            user: currentState.user,
          });

          return nextAccessToken;
        });
      }

      const newAccessToken = await refreshPromise;
      originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
      return httpClient(originalRequest);
    } catch (refreshError) {
      useSessionStore.getState().clearSession();
      await clearPersistedSession();
      throw toAppError(refreshError);
    } finally {
      refreshPromise = null;
    }
  }
);

export { toAppError };
