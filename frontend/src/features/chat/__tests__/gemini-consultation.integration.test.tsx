import { fetch as mockFetch } from 'expo/fetch';
import { streamAssistantMessage } from '../api/chat-api';
import { useSendMessage } from '../hooks/use-send-message';
import { httpClient } from '@/shared/api/http-client';
import { useSessionStore } from '@/features/auth/store/session-store';
import { useChatStore } from '../store/chat-store';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import React from 'react';
import type { SessionUser } from '@/features/auth/types/auth-types';
import type { StreamEvent } from '@/features/chat/types/chat-types';
import type { PaginatedMessages } from '@/features/chat/types/chat-types';

jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

const mockedFetch = jest.mocked(mockFetch);

describe('Gemini Consultation Streaming Integration', () => {
  const encoder = new TextEncoder();
  let testQueryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
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
    useChatStore.getState().setActiveChatId('chat-123');
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
  );

  it('should stream tokens, append them, and complete successfully', async () => {
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
    });

    const events: StreamEvent[] = [];
    await streamAssistantMessage({
      chatId: 'chat-123',
      assistantMessageId: 'assistant-msg-123',
      onEvent: (event) => events.push(event),
    });

    expect(events).toEqual([
      { type: 'token', value: 'Ayurveda' },
      { type: 'token', value: ' is holistic' },
      { type: 'done' },
    ]);
    expect(mockReader.releaseLock).toHaveBeenCalled();
  });

  it('should trigger useSendMessage hook and update TanStack React Query cache with streamed tokens', async () => {
    // 1. Mock the HTTP post endpoint for sending a message
    jest.spyOn(httpClient, 'post').mockResolvedValue({
      data: {
        userMessage: {
          id: 'user-msg-123',
          chatId: 'chat-123',
          role: 'user',
          content: 'Hello assistant',
          createdAt: new Date().toISOString(),
          status: 'complete',
        },
        assistantMessageId: 'assistant-msg-123',
      },
    });

    // 2. Mock the fetch stream response
    const mockReader = {
      read: jest.fn(),
      releaseLock: jest.fn(),
    };

    mockReader.read
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode('data: {"type":"token","token":"Spanda"}\n'),
      })
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode('data: {"type":"token","token":"Vidya"}\n'),
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
    });

    // 3. Render useSendMessage hook
    const { result } = await renderHook(() => useSendMessage('chat-123'), { wrapper });

    // 4. Trigger mutation
    await act(async () => {
      result.current.mutate({ content: 'Hello assistant' });
    });

    // 5. Let's wait a small amount of time for async stream processing to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 6. Verify that queryClient has updated state.
    const queryKey = ['users', 'user-777', 'chats', 'chat-123', 'messages'] as const;
    const cacheData = testQueryClient.getQueryData<InfiniteData<PaginatedMessages>>(queryKey);

    if (!cacheData) {
      throw new Error('Expected chat cache to exist');
    }

    const messages = cacheData.pages[0].items;

    const userMsg = messages.find(message => message.id === 'user-msg-123');
    if (!userMsg) {
      throw new Error('Expected user message to exist');
    }
    expect(userMsg.status).toBe('complete');

    const assistantMsg = messages.find(message => message.id === 'assistant-msg-123');
    if (!assistantMsg) {
      throw new Error('Expected assistant message to exist');
    }
    expect(assistantMsg.status).toBe('complete');
    expect(assistantMsg.content).toBe('SpandaVidya');
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
    });

    const events: StreamEvent[] = [];
    await streamAssistantMessage({
      chatId: 'chat-123',
      assistantMessageId: 'assistant-msg-999',
      onEvent: (event) => events.push(event),
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
