import {
  create,
  isAxiosError,
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { useSessionStore } from '@/features/auth/store/session-store';
import { clearPersistedSession, persistSession } from '@/shared/auth/token-storage';
import { env } from '@/shared/config/env';
import { AppError } from '@/shared/errors/app-error';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    _skipAuthRefresh?: boolean;
    _skipAuthHeader?: boolean;
    _requestStartedAt?: number;
  }
}

type RequestConfigWithRetry = InternalAxiosRequestConfig & AxiosRequestConfig;
type RefreshTokenPayload = {
  accessToken: string;
  refreshToken?: string;
};

class StaleRefreshResultError extends Error {
  constructor() {
    super('Ignoring stale auth refresh result');
    this.name = 'StaleRefreshResultError';
  }
}

export const httpClient = create({
  baseURL: env.EXPO_PUBLIC_API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
  // No withCredentials — tokens travel in Authorization header, not cookies
});

let refreshPromise: Promise<string> | null = null;

export function cancelAuthRefresh(): void {
  refreshPromise = null;
}

function isSessionUnchanged(version: number, refreshToken: string): boolean {
  const currentState = useSessionStore.getState();
  return currentState.version === version && currentState.refreshToken === refreshToken;
}

function getRequestUrl(config: AxiosRequestConfig): string {
  if (!config.url) return '';
  if (config.url.startsWith('http://') || config.url.startsWith('https://')) return config.url;

  const base = config.baseURL ?? env.EXPO_PUBLIC_API_URL ?? '';
  return `${base.replace(/\/+$/, '')}/${config.url.replace(/^\/+/, '')}`;
}

function logDev(label: string, payload: Record<string, unknown>) {
  if (!__DEV__) return;
  console.log(label, payload);
}

function logRequest(config: AxiosRequestConfig) {
  logDev('[http-client] request', {
    method: (config.method ?? 'GET').toUpperCase(),
    url: getRequestUrl(config),
  });
}

function logResponse(response: AxiosResponse) {
  const startedAt = response.config._requestStartedAt;
  const durationMs = typeof startedAt === 'number' ? Date.now() - startedAt : undefined;

  logDev('[http-client] response', {
    method: (response.config.method ?? 'GET').toUpperCase(),
    url: getRequestUrl(response.config),
    status: response.status,
    durationMs,
  });
}

function logError(error: AxiosError) {
  const config = error.config;
  const startedAt = config?._requestStartedAt;
  const durationMs = typeof startedAt === 'number' ? Date.now() - startedAt : undefined;
  const isNetworkError = !error.response;

  logDev('[http-client] error', {
    method: (config?.method ?? 'GET').toUpperCase(),
    url: config ? getRequestUrl(config) : '',
    status: error.response?.status ?? null,
    durationMs,
    networkError: isNetworkError,
    message: error.message,
    response: error.response?.data ?? null,
  });
}

function unwrapRefreshPayload(body: any): RefreshTokenPayload {
  if (body?.accessToken) return body;
  if (body?.data?.accessToken) return body.data;
  if (body?.data?.data?.accessToken) return body.data.data;
  return body?.data ?? body;
}

async function requestRefreshAccessToken(refreshToken: string): Promise<RefreshTokenPayload> {
  const response = await httpClient.post<any>(
    '/auth/refresh',
    { refreshToken },
    {
      _skipAuthRefresh: true,
      _skipAuthHeader: true,
    }
  );
  return unwrapRefreshPayload(response.data);
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

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
  config._requestStartedAt = Date.now();
  logRequest(config);

  const accessToken = useSessionStore.getState().accessToken;

  if (config._skipAuthHeader) {
    config.headers.delete('Authorization');
  } else if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return config;
});

// ─── Response Interceptor ────────────────────────────────────────────────────
// On 401: reads refreshToken from Zustand, calls /auth/refresh with it in body,
// updates store + SecureStore with new tokens, then retries original request
httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    logResponse(response);
    return response;
  },
  async (error: AxiosError) => {
    logError(error);

    const status = error.response?.status;
    const originalRequest = error.config as RequestConfigWithRetry | undefined;

    if (!originalRequest) throw toAppError(error);
    if (originalRequest._skipAuthRefresh || status !== 401 || originalRequest._retry) {
      throw toAppError(error);
    }

    if (__DEV__) {
      console.warn('[http-client] 401 received, attempting refresh', {
        url: originalRequest.url,
        hasRefreshToken: Boolean(useSessionStore.getState().refreshToken),
      });
    }

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
        const refreshTokenAtRequestStart = sessionStore.refreshToken;
        const sessionVersionAtRequestStart = sessionStore.version;

        refreshPromise = requestRefreshAccessToken(refreshTokenAtRequestStart).then(async refreshed => {
          const nextAccessToken = refreshed.accessToken;
          const nextRefreshToken = refreshed.refreshToken ?? refreshTokenAtRequestStart;
          const currentState = useSessionStore.getState();

          if (!nextAccessToken || !nextRefreshToken) {
            throw new AppError({
              message: 'Refresh response was missing auth tokens',
              code: 'UNAUTHORIZED',
              status: 401,
            });
          }

          if (!isSessionUnchanged(sessionVersionAtRequestStart, refreshTokenAtRequestStart)) {
            throw new StaleRefreshResultError();
          }

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
      if (refreshError instanceof StaleRefreshResultError) {
        throw toAppError(error);
      }

      if (isSessionUnchanged(sessionStore.version, sessionStore.refreshToken)) {
        useSessionStore.getState().clearSession();
        await clearPersistedSession();
      }
      throw toAppError(refreshError);
    } finally {
      refreshPromise = null;
    }
  }
);

export { toAppError };
