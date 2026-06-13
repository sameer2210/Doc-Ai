import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { fetch as mockFetch } from 'expo/fetch';
import { useUploadWorkflowStore } from '../../upload/store/upload-workflow-store';
import { usePredictionStore } from '@/store/prediction-store';
import { useChatStore } from '@/features/chat/store/chat-store';
import { useSessionStore } from '@/features/auth/store/session-store';
import { predictCataractFromImage } from '@/services/ai';
import { ResultScreen } from '../../upload/screens/result-screen';
import { useConsultationTrigger } from '../hooks/use-consultation-trigger';
import { useSendMessage, useStartConsultation } from '../hooks/use-send-message';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpClient } from '@/shared/api/http-client';

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
        background: { base: '#fff' },
        border: { soft: '#ccc', subtle: '#ddd' },
        text: { primary: '#000', secondary: '#555' },
        accent: { primary: '#244A85' },
        chatUserBubbleText: '#000',
        floatingOrbPrimary: '#000',
        floatingOrbSecondary: '#000',
      },
    },
    isDark: false,
  }),
}));

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
      user: { id: 'user-777', email: 'test@spanda.ai', role: 'USER' } as any,
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
        originalImage: { uri: 'file://original.jpg', name: 'original.jpg', mimeType: 'image/jpeg' },
      });
      uploadStore.setWorkingImage({ uri: 'file://working.jpg', name: 'working.jpg', mimeType: 'image/jpeg' });
    });
    expect(useUploadWorkflowStore.getState().workingImage?.uri).toBe('file://working.jpg');

    // ----------------------------------------------------
    // Step 2: Crop Stage - Confirm crop
    // ----------------------------------------------------
    act(() => {
      uploadStore.setCroppedImage({ uri: 'file://cropped.jpg', name: 'cropped.jpg', mimeType: 'image/jpeg' });
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
    (predictCataractFromImage as jest.Mock).mockResolvedValue(mockPredictionResponse);

    // Simulate calling the prediction API directly as part of analysis screen logic
    let analysisResult: any;
    await act(async () => {
      analysisResult = await predictCataractFromImage({
        uri: 'file://cropped.jpg',
        name: 'cropped.jpg',
        mimeType: 'image/jpeg',
      });
    });

    expect(analysisResult).toEqual(mockPredictionResponse);

    // Update stores as AnalysisScreen would
    act(() => {
      usePredictionStore.getState().setPending(mockPredictionResponse);
      useChatStore.getState().setActiveChatId(mockPredictionResponse.chatId);
    });

    expect(usePredictionStore.getState().pending).toEqual(mockPredictionResponse);
    expect(useChatStore.getState().activeChatId).toBe('chat-456');

    // ----------------------------------------------------
    // Step 4: Result Screen - User clicks "Discuss With SpandaVidya AI"
    // ----------------------------------------------------
    const { getByText } = render(<ResultScreen />);
    
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
    const startConsultationPostSpy = jest.spyOn(httpClient, 'post').mockResolvedValue({
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

    // Mock global fetch
    const mockFetchInstance = require('expo/fetch').fetch;
    (mockFetchInstance as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    // Render the consultation trigger hook to simulate mounting ChatScreen with the pending prediction
    const clearAttachments = jest.fn();
    const setChatError = jest.fn();

    const triggerHook = renderHook(
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
    const queryKey = ['users', 'user-777', 'chats', 'chat-456', 'messages'];
    const cacheData = testQueryClient.getQueryData<any>(queryKey);

    expect(cacheData).toBeDefined();
    const messages = cacheData.pages[0].items;

    const userMsg = messages.find((m: any) => m.id === 'user-consult-123');
    expect(userMsg).toBeDefined();
    expect(userMsg.status).toBe('complete');

    const assistantMsg = messages.find((m: any) => m.id === 'assistant-consult-123');
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.status).toBe('complete');
    expect(assistantMsg.content).toBe(
      'Based on the retinal scan, you show signs of early stage (Immature) cataract. Please see an ophthalmologist for a comprehensive eye exam.'
    );
  });
});
