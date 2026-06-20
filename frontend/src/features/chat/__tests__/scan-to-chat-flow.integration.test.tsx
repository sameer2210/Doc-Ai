// @ts-nocheck
import React from 'react';
import { render, fireEvent, act, renderHook } from '@testing-library/react-native';
import { fetch as mockFetch } from 'expo/fetch';
import { useUploadWorkflowStore } from '../../upload/store/upload-workflow-store';
import { usePredictionStore } from '@/store/prediction-store';
import { useChatStore } from '@/features/chat/store/chat-store';
import { useSessionStore } from '@/features/auth/store/session-store';
import { predictCataractFromImage } from '@/services/ai';
import { ResultScreen } from '../../upload/screens/result-screen';
import { useConsultationTrigger } from '../hooks/use-consultation-trigger';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { httpClient } from '@/shared/api/http-client';
import type { PaginatedMessages } from '@/features/chat/types/chat-types';
import type { SessionUser } from '@/features/auth/types/auth-types';
import type { WorkflowImage } from '@/features/upload/types/image.types';

// Mock expo router
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

// Mock native modules & services
jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
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

describe('Scan-to-Chat E2E Flow Integration Test', () => {
  const encoder = new TextEncoder();
  let testQueryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    useUploadWorkflowStore.getState().clearWorkflow();
    usePredictionStore.getState().clearAll();
    useChatStore.getState().clearActiveChat();
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

  it('completes the entire path: Upload -> Crop -> Analyze -> Result Screen -> Discuss -> Auto Consultation Chat Stream', async () => {
    // ----------------------------------------------------
    // Step 1: Upload Stage - Select working image
    // ----------------------------------------------------
    const uploadStore = useUploadWorkflowStore.getState();
    act(() => {
      uploadStore.startWorkflow({
        flowId: 'flow-123',
        origin: 'home',
        originalImage: buildWorkflowImage({
          uri: 'file://original.jpg',
          name: 'original.jpg',
        }),
      });
      uploadStore.setWorkingImage(
        buildWorkflowImage({
          uri: 'file://working.jpg',
          name: 'working.jpg',
        })
      );
    });
    expect(useUploadWorkflowStore.getState().workingImage?.uri).toBe('file://working.jpg');

    // ----------------------------------------------------
    // Step 2: Crop Stage - Confirm crop
    // ----------------------------------------------------
    act(() => {
      uploadStore.setCroppedImage(
        buildWorkflowImage({
          uri: 'file://cropped.jpg',
          name: 'cropped.jpg',
        })
      );
    });
    expect(useUploadWorkflowStore.getState().croppedImage?.uri).toBe('file://cropped.jpg');

    // ----------------------------------------------------
    // Step 3: Analysis Stage - Perform Prediction
    // ----------------------------------------------------
    const mockPredictionResponse = {
      prediction: 'Immature_Cataract',
      confidence: 0.88,
      uploadedImageUrl: 'https://s3/pic.jpg',
      chatId: 'chat-456',
    };
    mockedPredictCataractFromImage.mockResolvedValue(mockPredictionResponse);

    // Simulate calling the prediction API directly as part of analysis screen logic
    const analysisResult = await predictCataractFromImage({
      uri: 'file://cropped.jpg',
      name: 'cropped.jpg',
      mimeType: 'image/jpeg',
    });

    expect(analysisResult).toEqual(mockPredictionResponse);

    // Update stores as AnalysisScreen would
    act(() => {
      usePredictionStore.getState().setPending(mockPredictionResponse,true);
      useChatStore.getState().setActiveChatId(mockPredictionResponse.chatId);
    });

    expect(usePredictionStore.getState().pending).toEqual(mockPredictionResponse);
    expect(useChatStore.getState().activeChatId).toBe('chat-456');

    // ----------------------------------------------------
    // Step 4: Result Screen - User clicks "Discuss With SpandaVidya AI"
    // ----------------------------------------------------
    const rendered = await render(<ResultScreen />);
    console.log('ResultScreen render output:', JSON.stringify(rendered.toJSON(), null, 2));
    const { getByText } = rendered;

    // Verifies medical disclaimer and results render correctly
    expect(getByText('Immature Cataract')).toBeTruthy();
    expect(
      getByText(
        'This screening result is generated by an AI system and is not a medical diagnosis. Please consult a qualified ophthalmologist for professional evaluation and treatment decisions.'
      )
    ).toBeTruthy();

    const discussButton = getByText('Discuss With SpandaVidya AI');

    // Press discuss
    act(() => {
      fireEvent.press(discussButton);
    });

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/chat');

    // ----------------------------------------------------
    // Step 5: Chat Screen - Auto Consultation Trigger & SSE Stream response
    // ----------------------------------------------------
    // Mock the start consultation HTTP call
    jest.spyOn(httpClient, 'post').mockResolvedValue({
      data: {
        userMessage: {
          id: 'user-consult-123',
          chatId: 'chat-456',
          role: 'user',
          content: 'Analyzing retinal scan prediction: Immature_Cataract',
          createdAt: new Date().toISOString(),
          status: 'complete',
        },
        assistantMessageId: 'assistant-consult-123',
        limitReached: false,
      },
    });

    // Mock the SSE stream response from the server
    const mockReader = {
      read: jest.fn(),
      releaseLock: jest.fn(),
    };

    mockReader.read
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode('data: {"type":"token","token":"Based on the retinal scan, you show signs of early stage (Immature) cataract."}\n'),
      })
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode('data: {"type":"token","token":" Please see an ophthalmologist for a comprehensive eye exam."}\n'),
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
    } as any);

    // Render the consultation trigger hook to simulate mounting ChatScreen with the pending prediction
    const clearAttachments = jest.fn();
    const setChatError = jest.fn();

    await renderHook(
      () =>
        useConsultationTrigger({
          activeChatId: 'chat-456',
          clearAttachments,
          setChatError,
        }),
      { wrapper }
    );

    // Wait for the mutation to finish executing and the SSE stream to finish processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify stores were updated/cleared
    expect(usePredictionStore.getState().pending).toBeNull();
    expect(clearAttachments).toHaveBeenCalled();

    // Verify messages in query cache have completed and aggregated SSE tokens
    const queryKey = ['users', 'user-777', 'chats', 'chat-456', 'messages'] as const;
    const cacheData = testQueryClient.getQueryData<InfiniteData<PaginatedMessages>>(queryKey);

    expect(cacheData).toBeDefined();
    const messages = cacheData?.pages[0].items ?? [];

    const userMsg = messages.find(message => message.id === 'user-consult-123');
    if (!userMsg) {
      throw new Error('Expected user message to exist');
    }
    expect(userMsg.status).toBe('complete');

    const assistantMsg = messages.find(message => message.id === 'assistant-consult-123');
    if (!assistantMsg) {
      throw new Error('Expected assistant message to exist');
    }
    expect(assistantMsg.status).toBe('complete');
    expect(assistantMsg.content).toBe(
      'Based on the retinal scan, you show signs of early stage (Immature) cataract. Please see an ophthalmologist for a comprehensive eye exam.'
    );
  });
});
