import { fetch as mockFetch } from 'expo/fetch';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';

import { streamAssistantMessage } from '../api/chat-api';
import { useStartConsultation } from '../hooks/use-send-message';
import { httpClient } from '@/shared/api/http-client';
import { useSessionStore } from '@/features/auth/store/session-store';
import type { SessionUser } from '@/features/auth/types/auth-types';
import type { PaginatedMessages, StreamEvent } from '@/features/chat/types/chat-types';
import { queryKeys } from '@/shared/api/query-keys';

jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

const mockedFetch = jest.mocked(mockFetch);

describe('Gemini Consultation Streaming Integration', () => {
  const encoder = new TextEncoder();
  let testQueryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().clearSession();
    testQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    useSessionStore.getState().setSession({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: 'user-777',
        email: 'test@spanda.ai',
        bodyInsightCompleted: false,
      } satisfies SessionUser,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
  );

  it('streams tokens and completes the assistant message', async () => {
    const mockReader = {
      read: jest.fn(),
      releaseLock: jest.fn(),
    };

    mockReader.read
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode('data: {"type":"token","token":"Ayurveda"}\n'),
      })
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode('data: {"type":"token","token":" is holistic"}\n'),
      })
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode('data: [DONE]\n'),
      })
      .mockResolvedValueOnce({
        done: true,
      });

    mockedFetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    } as never);

    const events: StreamEvent[] = [];
    await streamAssistantMessage({
      chatId: 'chat-123',
      assistantMessageId: 'assistant-msg-123',
      onEvent: event => events.push(event),
    });

    expect(events).toEqual([
      { type: 'token', value: 'Ayurveda' },
      { type: 'token', value: ' is holistic' },
      { type: 'done' },
    ]);
    expect(mockReader.releaseLock).toHaveBeenCalled();
  });

  it('starts consultation once, inserts one user scan message, and streams one Gemini response', async () => {
    const httpPostSpy = jest.spyOn(httpClient, 'post').mockResolvedValue({
      data: {
        userMessage: {
          id: 'user-consult-123',
          chatId: 'chat-123',
          role: 'user',
          content: 'Analyzing retinal scan prediction: Immature_Cataract',
          createdAt: new Date().toISOString(),
          status: 'complete',
        },
        assistantMessageId: 'assistant-consult-123',
        limitReached: false,
      },
    } as never);

    const mockReader = {
      read: jest.fn(),
      releaseLock: jest.fn(),
    };

    mockReader.read
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode(
          'data: {"type":"token","token":"Based on the retinal scan, you show signs of early stage (Immature Cataract) cataract."}\n',
        ),
      })
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode(
          'data: {"type":"token","token":" Please see an ophthalmologist for a comprehensive eye exam."}\n',
        ),
      })
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode('data: [DONE]\n'),
      })
      .mockResolvedValueOnce({
        done: true,
      });

    mockedFetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    } as never);

    const { result } = await renderHook(() => useStartConsultation('chat-123'), { wrapper });

    await act(async () => {
      result.current.mutate({ prediction: 'Immature_Cataract', confidence: 0.88 });
    });

    await waitFor(() => expect(httpPostSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));

    const queryKey = queryKeys.chats.messages('user-777', 'chat-123');
    const cacheData = testQueryClient.getQueryData<InfiniteData<PaginatedMessages>>(queryKey);

    expect(cacheData).toBeDefined();
    const messages = cacheData?.pages[0].items ?? [];

    const userMessages = messages.filter(message => message.role === 'user');
    const assistantMessages = messages.filter(message => message.role === 'assistant');

    expect(userMessages).toHaveLength(1);
    expect(assistantMessages).toHaveLength(1);

    const userMsg = userMessages[0];
    const assistantMsg = assistantMessages[0];

    expect(userMsg.id).toBe('user-consult-123');
    expect(userMsg.status).toBe('complete');
    expect(userMsg.content).toBe('Analyzing retinal scan prediction: Immature_Cataract');

    expect(assistantMsg.id).toBe('assistant-consult-123');
    expect(assistantMsg.status).toBe('complete');
    expect(assistantMsg.type).toBe('scan_result');
    expect(assistantMsg.scanResult?.prediction).toBe('Immature_Cataract');
    expect(assistantMsg.scanResult?.confidence).toBe(0.88);
    expect(assistantMsg.content).toBe(
      'Based on the retinal scan, you show signs of early stage (Immature Cataract) cataract. Please see an ophthalmologist for a comprehensive eye exam.'
    );
  });

  it('should handle streaming error event and set message status to error', async () => {
    const mockReader = {
      read: jest.fn(),
      releaseLock: jest.fn(),
    };

    mockReader.read
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode('data: {"type":"token","token":"Error content"}\n'),
      })
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode('data: {"type":"error","code":"DAILY_LIMIT_REACHED","message":"Limit exceeded"}\n'),
      })
      .mockResolvedValueOnce({
        done: true,
      });

    mockedFetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    } as never);

    const events: StreamEvent[] = [];
    await streamAssistantMessage({
      chatId: 'chat-123',
      assistantMessageId: 'assistant-msg-999',
      onEvent: event => events.push(event),
    });

    expect(events).toEqual([
      { type: 'token', value: 'Error content' },
      {
        type: 'error',
        code: 'DAILY_LIMIT_REACHED',
        message: 'Limit exceeded',
      },
    ]);
  });
});
