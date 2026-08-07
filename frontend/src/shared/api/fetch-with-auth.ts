import { fetch } from 'expo/fetch';

import { useSessionStore } from '@/features/auth/store/session-store';
import { acquireFreshAccessToken, toAppError } from '@/shared/api/http-client';
import { clearUserScopedClientState } from '@/shared/auth/client-session-boundary';

export async function fetchWithAuth(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const getHeaders = (token: string | null): Headers => {
    const headers = new Headers(init?.headers);
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  };

  const initialToken = useSessionStore.getState().accessToken;
  const initialHeaders = getHeaders(initialToken);

  const requestOptions: RequestInit = {
    ...init,
    headers: initialHeaders,
  };
  if (requestOptions.body === null) {
    delete requestOptions.body;
  }

  let response = await fetch(input, requestOptions as Parameters<typeof fetch>[1]);

  if (response.status === 401) {
    try {
      const freshToken = await acquireFreshAccessToken();
      const retryHeaders = getHeaders(freshToken);

      const retryOptions: RequestInit = {
        ...init,
        headers: retryHeaders,
      };
      if (retryOptions.body === null) {
        delete retryOptions.body;
      }

      response = await fetch(input, retryOptions as Parameters<typeof fetch>[1]);
    } catch (refreshError) {
      await clearUserScopedClientState();
      throw toAppError(refreshError);
    }
  }

  return response;
}
