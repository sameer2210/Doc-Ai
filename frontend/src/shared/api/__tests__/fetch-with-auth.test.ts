import { fetch as mockFetch } from 'expo/fetch';
import { fetchWithAuth } from '../fetch-with-auth';
import { useSessionStore } from '@/features/auth/store/session-store';
import * as httpClientModule from '@/shared/api/http-client';
import * as clientSessionBoundaryModule from '@/shared/auth/client-session-boundary';

jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

jest.mock('@/shared/api/http-client', () => ({
  acquireFreshAccessToken: jest.fn(),
  toAppError: jest.fn((err) => err),
}));

jest.mock('@/shared/auth/client-session-boundary', () => ({
  clearUserScopedClientState: jest.fn(),
}));

const mockExpoFetch = mockFetch as unknown as jest.Mock;

describe('fetchWithAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.setState({
      accessToken: 'initial-access-token',
      refreshToken: 'initial-refresh-token',
      user: null,
      hydrated: true,
      version: 1,
    });
  });

  it('attaches Authorization header and performs fetch call', async () => {
    mockExpoFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
    } as Response);

    const response = await fetchWithAuth('https://api.example.com/chats/123/stream');

    expect(response.status).toBe(200);
    expect(mockExpoFetch).toHaveBeenCalledTimes(1);
    expect(mockExpoFetch).toHaveBeenCalledWith('https://api.example.com/chats/123/stream', {
      headers: expect.any(Headers),
    });

    const passedHeaders = mockExpoFetch.mock.calls[0][1].headers as Headers;
    expect(passedHeaders.get('Authorization')).toBe('Bearer initial-access-token');
  });

  it('handles 401 response by refreshing token via acquireFreshAccessToken and retrying exactly once', async () => {
    mockExpoFetch
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
      } as Response);

    (httpClientModule.acquireFreshAccessToken as jest.Mock).mockResolvedValueOnce('refreshed-access-token');

    const response = await fetchWithAuth('https://api.example.com/chats/123/stream');

    expect(response.status).toBe(200);
    expect(mockExpoFetch).toHaveBeenCalledTimes(2);
    expect(httpClientModule.acquireFreshAccessToken).toHaveBeenCalledTimes(1);

    const retryHeaders = mockExpoFetch.mock.calls[1][1].headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer refreshed-access-token');
  });

  it('clears user session when refresh fails on 401', async () => {
    mockExpoFetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
    } as Response);

    const refreshError = new Error('Refresh failed');
    (httpClientModule.acquireFreshAccessToken as jest.Mock).mockRejectedValueOnce(refreshError);

    await expect(fetchWithAuth('https://api.example.com/chats/123/stream')).rejects.toThrow();

    expect(clientSessionBoundaryModule.clearUserScopedClientState).toHaveBeenCalledTimes(1);
  });
});
