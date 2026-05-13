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
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string> | null = null;

function toAppError(error: unknown): AppError {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ??
      error.message ??
      'Unexpected error occurred while communicating with server';

    if (!status) {
      return new AppError({
        message,
        code: 'NETWORK_ERROR',
        retryable: true,
        details: error.response?.data,
      });
    }

    if (status === 401) {
      return new AppError({ message, code: 'UNAUTHORIZED', status, retryable: false });
    }
    if (status === 403) {
      return new AppError({ message, code: 'FORBIDDEN', status, retryable: false });
    }
    if (status === 404) {
      return new AppError({ message, code: 'NOT_FOUND', status, retryable: false });
    }
    if (status === 422) {
      return new AppError({ message, code: 'VALIDATION_ERROR', status, retryable: false });
    }
    if (status === 429) {
      return new AppError({ message, code: 'RATE_LIMITED', status, retryable: true });
    }
    if (status >= 500) {
      return new AppError({ message, code: 'SERVER_ERROR', status, retryable: true });
    }
  }

  return new AppError({
    message: error instanceof Error ? error.message : 'Unknown application error',
    code: 'UNKNOWN_ERROR',
  });
}

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = useSessionStore.getState().accessToken;
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

httpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RequestConfigWithRetry | undefined;
    if (!originalRequest) {
      throw toAppError(error);
    }

    if (status !== 401 || originalRequest._retry) {
      throw toAppError(error);
    }

    originalRequest._retry = true;
    const sessionStore = useSessionStore.getState();
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

          currentState.setSession({
            accessToken: nextAccessToken,
            refreshToken: nextRefreshToken,
            user: currentState.user,
          });
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
