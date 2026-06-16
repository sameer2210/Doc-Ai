import {
  create,
  isAxiosError,
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { useSessionStore } from '@/features/auth/store/session-store';
import { queryClient } from '@/shared/api/query-client';
import { clearPersistedSession, persistSession } from '@/shared/auth/token-storage';
import { env } from '@/shared/config/env';
import { AppError } from '@/shared/errors/app-error';
import { useAuthStore } from '@/store/auth-store';
import { usePredictionStore } from '@/store/prediction-store';
import {
  AI_MODEL_LOADING_MESSAGE,
  AI_SERVICE_UNAVAILABLE_MESSAGE,
  getUploadStatusMessage,
} from '@/shared/uploads/upload-errors';

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
type ApiEnvelope<T> = {
  data?: ApiEnvelope<T> | T;
};
type ApiErrorPayload = {
  message?: string;
  data?: {
    message?: string;
  };
};

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return Boolean(value && typeof value === 'object');
}

class StaleRefreshResultError extends Error {
  constructor() {
    super('Ignoring stale auth refresh result');
    this.name = 'StaleRefreshResultError';
  }
}

function clearInMemoryUserState(): void {
  // Previously cleared all queries, which removed optimistic messages.
  // Now only remove queries related to the current user to keep chat UI intact.
  const session = useSessionStore.getState();
  const userId = session.user?.id ?? 'anonymous';
  // Remove all queries under the 'users' namespace for this user.
  queryClient.removeQueries({
    predicate: (query) => {
      const keys = query.queryKey as unknown[];
      return keys.length > 0 && keys[0] === 'users' && keys[1] === userId;
    },
  });
  useAuthStore.getState().setToken(null);
  usePredictionStore.getState().clearAll();
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

function isImageUploadRequest(config?: AxiosRequestConfig): boolean {
  const url = getRequestUrl(config ?? {});
  return url.includes('/ai/predict') || url.includes('/uploads/image');
}

function isTimeoutLikeError(error: AxiosError): boolean {
  const message = error.message.toLowerCase();
  return error.code === 'ECONNABORTED' || message.includes('timeout') || message.includes('timed out');
}

function extractResponseMessage(error: AxiosError): string | undefined {
  const responseData = isApiErrorPayload(error.response?.data) ? error.response?.data : undefined;
  const nestedMessage = responseData?.data?.message;
  if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
    return nestedMessage;
  }

  const message = responseData?.message;
  return typeof message === 'string' && message.trim() ? message : undefined;
}

// function logDev(label: string, payload: Record<string, unknown>) {
//   if (!__DEV__) return;
function logDev(label: string, payload: Record<string, unknown>) {
  if (!__DEV__) return;

  console.log('\n');
  console.log('======================================');
  console.log(label);
  console.log(JSON.stringify(payload, null, 2));
  console.log('======================================');
  console.log('\n');
}

// function logRequest(config: AxiosRequestConfig) {
//   logDev('[http-client] request', {
//     method: (config.method ?? 'GET').toUpperCase(),
//     url: getRequestUrl(config),
//   });
// }

function logRequest(config: AxiosRequestConfig) {
  logDev('FRONTEND REQUEST', {
    method: (config.method ?? 'GET').toUpperCase(),
    url: getRequestUrl(config),
    headers: config.headers,
    body: config.data,
    params: config.params,
  });
}

// function logResponse(response: AxiosResponse) {
//   const startedAt = response.config._requestStartedAt;
//   const durationMs = typeof startedAt === 'number' ? Date.now() - startedAt : undefined;

//   logDev('[http-client] response', {
//     method: (response.config.method ?? 'GET').toUpperCase(),
//     url: getRequestUrl(response.config),
//     status: response.status,
//     durationMs,
//   });
// }

function logResponse(response: AxiosResponse) {
  const startedAt = response.config._requestStartedAt;

  const durationMs = typeof startedAt === 'number' ? Date.now() - startedAt : undefined;

  logDev('FRONTEND RESPONSE', {
    method: (response.config.method ?? 'GET').toUpperCase(),
    url: getRequestUrl(response.config),
    status: response.status,
    durationMs,
    response: response.data,
  });
}

// function logError(error: AxiosError) {
//   const config = error.config;
//   const startedAt = config?._requestStartedAt;
//   const durationMs = typeof startedAt === 'number' ? Date.now() - startedAt : undefined;
//   const isNetworkError = !error.response;

//   logDev('[http-client] error', {
//     method: (config?.method ?? 'GET').toUpperCase(),
//     url: config ? getRequestUrl(config) : '',
//     status: error.response?.status ?? null,
//     durationMs,
//     networkError: isNetworkError,
//     message: error.message,
//     response: error.response?.data ?? null,
//   });
// }

function logError(error: AxiosError) {
  const config = error.config;
  const startedAt = config?._requestStartedAt;
  const durationMs = typeof startedAt === 'number' ? Date.now() - startedAt : undefined;

  logDev('FRONTEND ERROR', {
    method: (config?.method ?? 'GET').toUpperCase(),
    url: config ? getRequestUrl(config) : '',
    status: error.response?.status,
    durationMs,
    message: error.message,
    requestBody: config?.data,
    responseBody: error.response?.data,
  });
}

function isRefreshTokenPayload(value: unknown): value is RefreshTokenPayload {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'accessToken' in value &&
      typeof (value as RefreshTokenPayload).accessToken === 'string',
  );
}

function unwrapRefreshPayload(body: unknown): RefreshTokenPayload {
  const envelope = body as ApiEnvelope<RefreshTokenPayload> | undefined;
  const levelOne = envelope?.data;
  const levelTwo = (levelOne as ApiEnvelope<RefreshTokenPayload> | undefined)?.data;
  const candidate = levelTwo ?? levelOne ?? body;
  if (!isRefreshTokenPayload(candidate)) {
    throw new AppError({
      message: 'Refresh response was missing auth tokens',
      code: 'UNAUTHORIZED',
      status: 401,
    });
  }
  return candidate;
}

async function requestRefreshAccessToken(refreshToken: string): Promise<RefreshTokenPayload> {
  const response = await httpClient.post<unknown>(
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
    const responseMessage = extractResponseMessage(error);
    const requestIsImageUpload = isImageUploadRequest(error.config);
    const timeoutLikeError = isTimeoutLikeError(error);

    if (requestIsImageUpload) {
      if (!status) {
        return new AppError({
          message: timeoutLikeError ? AI_MODEL_LOADING_MESSAGE : AI_SERVICE_UNAVAILABLE_MESSAGE,
          code: timeoutLikeError ? 'UPLOAD_TIMEOUT' : 'UPLOAD_SERVICE_UNAVAILABLE',
          status: 503,
          retryable: true,
        });
      }

      if (status === 400) {
        return new AppError({
          message: getUploadStatusMessage(status, responseMessage) ?? 'Invalid image file',
          code: 'UPLOAD_VALIDATION_ERROR',
          status,
          retryable: false,
        });
      }

      if (status === 413) {
        return new AppError({
          message: getUploadStatusMessage(status, responseMessage) ?? 'Image exceeds 5 MB limit',
          code: 'UPLOAD_TOO_LARGE',
          status,
          retryable: false,
        });
      }

      if (status === 503) {
        const isLoadingResponse =
          responseMessage?.toLowerCase().includes('loading') ?? timeoutLikeError;
        return new AppError({
          message: getUploadStatusMessage(status, responseMessage) ?? 'AI service is temporarily unavailable. Please try again later.',
          code: isLoadingResponse ? 'UPLOAD_TIMEOUT' : 'UPLOAD_SERVICE_UNAVAILABLE',
          status,
          retryable: true,
        });
      }

      if (status >= 500) {
        return new AppError({
          message: responseMessage ?? 'AI service is temporarily unavailable. Please try again later.',
          code: 'UPLOAD_SERVICE_UNAVAILABLE',
          status,
          retryable: true,
        });
      }
    }

    const message = responseMessage ?? error.message ?? 'Unexpected error';

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
      clearInMemoryUserState();
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
        clearInMemoryUserState();
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
