// @ts-nocheck
import React from 'react';
import { render, fireEvent, act, renderHook, waitFor } from '@testing-library/react-native';
import { fetch as mockFetch } from 'expo/fetch';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';

import { ResultScreen } from '@/features/upload/screens/result-screen';
import { useImageAnalysis } from '@/features/upload/hooks/use-image-analysis';
import { useConsultationTrigger } from '@/features/chat/hooks/use-consultation-trigger';
import { useUploadWorkflowStore } from '@/features/upload/store/upload-workflow-store';
import { usePredictionStore } from '@/store/prediction-store';
import { useChatStore } from '@/features/chat/store/chat-store';
import { useSessionStore } from '@/features/auth/store/session-store';
import { predictCataractFromImage } from '@/services/ai';
import { httpClient } from '@/shared/api/http-client';
import type { PaginatedMessages } from '@/features/chat/types/chat-types';
import type { SessionUser } from '@/features/auth/types/auth-types';
import type { WorkflowImage } from '@/features/upload/types/image.types';
import { queryKeys } from '@/shared/api/query-keys';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  Stack: {
    Screen: () => null,
  },
}));

jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

jest.mock('@/components/ui/ScreenBackground', () => ({
  ScreenBackground: () => null,
}));

jest.mock('@/services/ai', () => ({
  predictCataractFromImage: jest.fn(),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: { base: '#fff', surface: '#fff', elevated: '#fff', surfaceStrong: '#fff' },
        border: { soft: '#ccc', subtle: '#ddd' },
        text: { primary: '#000', secondary: '#555', success: '#22c55e', warning: '#eab308', danger: '#ef4444' },
        accent: { primary: '#244A85' },
        chatUserBubbleText: '#000',
        floatingOrbPrimary: '#000',
        floatingOrbSecondary: '#000',
        floatingOrbOpacityScale: { primary: 1, secondary: 1 },
        successSurface: '#f0fdf4',
        errorSurface: '#fef2f2',
        accentSurface: '#eff6ff',
        warningSurface: '#fffbed',
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        xxl: 24,
      },
      radii: {
        md: 8,
        lg: 12,
        xl: 16,
        full: 9999,
      },
    },
    isDark: false,
  }),
}));

const mockedPredictCataractFromImage = jest.mocked(predictCataractFromImage);
const mockedFetch = jest.mocked(mockFetch);

function buildWorkflowImage(overrides: Partial<WorkflowImage> = {}): WorkflowImage {
  return {
    uri: 'file://image.jpg',
    name: 'image.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 1024,
    width: 1000,
    height: 1000,
    ...overrides,
  };
}

function createWrapper(queryClient: QueryClient) {
  function TestQueryClientWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  TestQueryClientWrapper.displayName = 'TestQueryClientWrapper';

  return TestQueryClientWrapper;
}

function mockConsultationPipeline(args: {
  chatId: string;
  userMessageId: string;
  assistantMessageId: string;
  prediction: string;
  confidence: number;
  streamTokens: string[];
}) {
  const httpPostSpy = jest.spyOn(httpClient, 'post').mockResolvedValue({
    data: {
      userMessage: {
        id: args.userMessageId,
        chatId: args.chatId,
        role: 'user',
        content: `Analyzing retinal scan prediction: ${args.prediction}`,
        createdAt: new Date().toISOString(),
        status: 'complete',
      },
      assistantMessageId: args.assistantMessageId,
      limitReached: false,
    },
  } as never);

  const encoder = new TextEncoder();
  const mockReader = {
    read: jest.fn(),
    releaseLock: jest.fn(),
  };

  for (const token of args.streamTokens) {
    mockReader.read.mockResolvedValueOnce({
      done: false,
      value: encoder.encode(
        `data: ${JSON.stringify({ type: 'token', token })}\n`,
      ),
    });
  }

  mockReader.read
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

  return { httpPostSpy, mockReader };
}

describe('Scan-to-Chat flow integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    useUploadWorkflowStore.getState().clearWorkflow();
    usePredictionStore.getState().clearAll();
    useChatStore.getState().clearActiveChat();
    useSessionStore.getState().clearSession();

    queryClient = new QueryClient({
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

  it('home scan renders the result screen, waits for Discuss, then auto-consults exactly once', async () => {
    const analysisResult = {
      prediction: 'Immature_Cataract',
      confidence: 0.88,
      uploadedImageUrl: 'https://s3/pic.jpg',
      chatId: 'chat-456',
    };

    mockedPredictCataractFromImage.mockResolvedValue(analysisResult);

    useUploadWorkflowStore.getState().startWorkflow({
      flowId: 'flow-home',
      origin: 'home',
      originalImage: buildWorkflowImage({
        uri: 'file://original.jpg',
        name: 'original.jpg',
      }),
    });

    const { result: analysisHook } = await renderHook(() => useImageAnalysis(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await analysisHook.current.analyzeImage(buildWorkflowImage({ uri: 'file://cropped.jpg' }));
    });

    expect(mockReplace).toHaveBeenCalledWith('/scan-result');
    expect(usePredictionStore.getState().pending).toEqual(analysisResult);
    expect(usePredictionStore.getState().shouldAutoConsult).toBe(false);
    expect(useChatStore.getState().activeChatId).toBeNull();

    const { getByText, queryByText } = await render(<ResultScreen />, {
      wrapper: createWrapper(queryClient),
    });

    expect(getByText('Discuss With SpandaVidya AI')).toBeTruthy();
    expect(queryByText('Retake Scan')).toBeNull();
    expect(queryByText('Return Home')).toBeNull();
    expect(mockedFetch).not.toHaveBeenCalled();

    const discussButton = getByText('Discuss With SpandaVidya AI');
    await act(async () => {
      fireEvent.press(discussButton);
    });

    expect(useChatStore.getState().activeChatId).toBe('chat-456');
    expect(usePredictionStore.getState().shouldAutoConsult).toBe(true);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/chat');

    const { httpPostSpy } = mockConsultationPipeline({
      chatId: 'chat-456',
      userMessageId: 'user-consult-123',
      assistantMessageId: 'assistant-consult-123',
      prediction: 'Immature_Cataract',
      confidence: 0.88,
      streamTokens: [
        'Based on the retinal scan, you show signs of early stage (Immature Cataract) cataract.',
        ' Please see an ophthalmologist for a comprehensive eye exam.',
      ],
    });

    const clearAttachments = jest.fn();
    const setChatError = jest.fn();

    await renderHook(
      () =>
        useConsultationTrigger({
          activeChatId: 'chat-456',
          clearAttachments,
          setChatError,
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(httpPostSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(usePredictionStore.getState().pending).toBeNull());

    expect(clearAttachments).toHaveBeenCalledTimes(1);
    expect(setChatError).toHaveBeenCalledWith(null);

    const queryKey = queryKeys.chats.messages('user-777', 'chat-456');
    const cacheData = queryClient.getQueryData<InfiniteData<PaginatedMessages>>(queryKey);

    expect(cacheData).toBeDefined();
    const messages = cacheData?.pages[0].items ?? [];
    expect(messages.filter(message => message.role === 'user')).toHaveLength(1);
    expect(messages.filter(message => message.role === 'assistant')).toHaveLength(1);

    const assistantMessage = messages.find(message => message.role === 'assistant');
    expect(assistantMessage?.status).toBe('complete');
    expect(assistantMessage?.content).toBe(
      'Based on the retinal scan, you show signs of early stage (Immature Cataract) cataract. Please see an ophthalmologist for a comprehensive eye exam.'
    );
  });

  it('home scan failure renders the error result screen with retake and home actions', async () => {
    mockedPredictCataractFromImage.mockRejectedValue(new Error('Invalid image file'));

    useUploadWorkflowStore.getState().startWorkflow({
      flowId: 'flow-home-fail',
      origin: 'home',
      originalImage: buildWorkflowImage({
        uri: 'file://original.jpg',
        name: 'original.jpg',
      }),
    });

    const { result: analysisHook } = await renderHook(() => useImageAnalysis(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await analysisHook.current.analyzeImage(buildWorkflowImage({ uri: 'file://cropped.jpg' }));
    });

    expect(mockReplace).toHaveBeenCalledWith('/scan-result');
    expect(usePredictionStore.getState().pending).toBeNull();
    expect(useUploadWorkflowStore.getState().lastErrorCode).toBe('ANALYSIS_FAILED');

    const { getByText } = await render(<ResultScreen />, {
      wrapper: createWrapper(queryClient),
    });

    expect(getByText('Analysis Failed')).toBeTruthy();
    expect(getByText('Retake Scan')).toBeTruthy();
    expect(getByText('Return Home')).toBeTruthy();
  });

  it('chat-origin scan skips the result screen and auto-consults the current chat exactly once', async () => {
    const analysisResult = {
      prediction: 'Mature',
      confidence: 0.91,
      uploadedImageUrl: 'https://s3/pic-chat.jpg',
      chatId: 'chat-456',
    };

    mockedPredictCataractFromImage.mockResolvedValue(analysisResult);

    useChatStore.getState().setActiveChatId('chat-456');
    useUploadWorkflowStore.getState().startWorkflow({
      flowId: 'flow-chat',
      origin: 'chat',
      chatId: 'chat-456',
      originalImage: buildWorkflowImage({
        uri: 'file://original-chat.jpg',
        name: 'original-chat.jpg',
      }),
    });

    const { result: analysisHook } = await renderHook(() => useImageAnalysis(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await analysisHook.current.analyzeImage(buildWorkflowImage({ uri: 'file://cropped-chat.jpg' }));
    });

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/chat');
    expect(mockReplace).not.toHaveBeenCalledWith('/scan-result');
    expect(usePredictionStore.getState().pending).toEqual(analysisResult);
    expect(usePredictionStore.getState().shouldAutoConsult).toBe(true);
    expect(useChatStore.getState().activeChatId).toBe('chat-456');

    const { httpPostSpy } = mockConsultationPipeline({
      chatId: 'chat-456',
      userMessageId: 'user-consult-chat-123',
      assistantMessageId: 'assistant-consult-chat-123',
      prediction: 'Mature',
      confidence: 0.91,
      streamTokens: [
        'We can see signs consistent with advanced cataract progression.',
        ' Please schedule a specialist eye exam.',
      ],
    });

    const clearAttachments = jest.fn();
    const setChatError = jest.fn();

    await renderHook(
      () =>
        useConsultationTrigger({
          activeChatId: 'chat-456',
          clearAttachments,
          setChatError,
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(httpPostSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(usePredictionStore.getState().pending).toBeNull());

    const queryKey = queryKeys.chats.messages('user-777', 'chat-456');
    const cacheData = queryClient.getQueryData<InfiniteData<PaginatedMessages>>(queryKey);
    const messages = cacheData?.pages[0].items ?? [];

    expect(messages.filter(message => message.role === 'user')).toHaveLength(1);
    expect(messages.filter(message => message.role === 'assistant')).toHaveLength(1);
    expect(clearAttachments).toHaveBeenCalledTimes(1);
    expect(setChatError).toHaveBeenCalledWith(null);
  });

  it('chat-origin failure returns to the error result screen', async () => {
    mockedPredictCataractFromImage.mockRejectedValue(new Error('AI service unavailable'));

    useChatStore.getState().setActiveChatId('chat-456');
    useUploadWorkflowStore.getState().startWorkflow({
      flowId: 'flow-chat-fail',
      origin: 'chat',
      chatId: 'chat-456',
      originalImage: buildWorkflowImage({
        uri: 'file://original-chat.jpg',
        name: 'original-chat.jpg',
      }),
    });

    const { result: analysisHook } = await renderHook(() => useImageAnalysis(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await analysisHook.current.analyzeImage(buildWorkflowImage({ uri: 'file://cropped-chat.jpg' }));
    });

    expect(mockReplace).toHaveBeenCalledWith('/scan-result');
    expect(usePredictionStore.getState().pending).toBeNull();
    expect(useUploadWorkflowStore.getState().lastErrorCode).toBe('ANALYSIS_FAILED');

    const { getByText } = await render(<ResultScreen />, {
      wrapper: createWrapper(queryClient),
    });

    expect(getByText('Analysis Failed')).toBeTruthy();
    expect(getByText('Retake Scan')).toBeTruthy();
    expect(getByText('Return Home')).toBeTruthy();
  });
});
