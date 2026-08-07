import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useImageAnalysis } from '../use-image-analysis';
import { useSessionStore } from '@/features/auth/store/session-store';
import { usePredictionStore } from '@/store/prediction-store';
import { useChatStore } from '@/features/chat/store/chat-store';
import { useUploadWorkflowStore } from '../../store/upload-workflow-store';
import { predictCataractFromImage } from '@/services/ai';
import type { SessionUser } from '@/features/auth/types/auth-types';
import * as Network from 'expo-network';
import { AxiosError } from 'axios';

jest.mock('@/services/ai');
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn().mockResolvedValue({ isConnected: true }),
}));

const mockInvalidateQueries = jest.fn();
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

const mockedPredictCataractFromImage = jest.mocked(predictCataractFromImage);

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

describe('useImageAnalysis Hook', () => {
  const mockImage = {
    uri: 'file://test.jpg',
    name: 'test.jpg',
    mimeType: 'image/jpeg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().clearSession();
    usePredictionStore.getState().clearAll();
    useChatStore.getState().clearActiveChat();
    useUploadWorkflowStore.getState().clearWorkflow();
  });

  it('should redirect to login if user is not logged in', async () => {
    const { result } = await renderHook(() => useImageAnalysis());

    await act(async () => {
      await result.current.analyzeImage(mockImage);
    });

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should successfully call prediction API, update stores, and route to result screen', async () => {
    const mockUser: SessionUser = {
      id: 'user-123',
      email: 'test@example.com',
      bodyInsightCompleted: false,
    };

    useSessionStore.getState().setSession({
      accessToken: 'mock-access',
      refreshToken: 'mock-refresh',
      user: mockUser,
    });

    const mockPredictResult = {
      prediction: 'Immature',
      confidence: 0.87,
      uploadedImageUrl: 'https://s3/uploaded.png',
      chatId: 'chat-456',
    };
    mockedPredictCataractFromImage.mockResolvedValue(mockPredictResult);

    const { result } = await renderHook(() => useImageAnalysis());

    await act(async () => {
      await result.current.analyzeImage(mockImage);
    });

    expect(result.current.analysisError).toBeNull();
    expect(result.current.isPredicting).toBe(false);

    expect(usePredictionStore.getState().pending).toEqual(mockPredictResult);
    expect(usePredictionStore.getState().shouldAutoConsult).toBe(false);
    expect(useChatStore.getState().activeChatId).toBeNull();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['chats', 'list'],
    });

    expect(mockReplace).toHaveBeenCalledWith('/scan-result');
    expect(mockedPredictCataractFromImage).toHaveBeenCalledWith(mockImage, undefined);
  });

  it('should route chat-origin scans directly back to chat and mark consultation as auto-startable', async () => {
    const mockUser: SessionUser = {
      id: 'user-123',
      email: 'test@example.com',
      bodyInsightCompleted: false,
    };

    useSessionStore.getState().setSession({
      accessToken: 'mock-access',
      refreshToken: 'mock-refresh',
      user: mockUser,
    });
    useChatStore.getState().setActiveChatId('chat-456');
    useUploadWorkflowStore.getState().startWorkflow({
      flowId: 'flow-chat',
      origin: 'chat',
      chatId: 'chat-456',
      originalImage: {
        uri: 'file://original.jpg',
        name: 'original.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 1024,
        width: 1000,
        height: 1000,
      },
    });

    const mockPredictResult = {
      prediction: 'Mature',
      confidence: 0.91,
      uploadedImageUrl: 'https://s3/uploaded-chat.png',
      chatId: 'chat-456',
    };
    mockedPredictCataractFromImage.mockResolvedValue(mockPredictResult);

    const { result } = await renderHook(() => useImageAnalysis());

    await act(async () => {
      await result.current.analyzeImage(mockImage);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/chat');
    });

    expect(result.current.analysisError).toBeNull();
    expect(usePredictionStore.getState().pending).toEqual(mockPredictResult);
    expect(usePredictionStore.getState().shouldAutoConsult).toBe(true);
    expect(useChatStore.getState().activeChatId).toBe('chat-456');
    expect(mockedPredictCataractFromImage).toHaveBeenCalledWith(mockImage, 'chat-456');
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['chats', 'list'],
    });
  });

  it('should handle API validation failure (400)', async () => {
    const mockUser: SessionUser = {
      id: 'user-123',
      email: 'test@example.com',
      bodyInsightCompleted: false,
    };

    useSessionStore.getState().setSession({
      accessToken: 'mock-access',
      refreshToken: 'mock-refresh',
      user: mockUser,
    });

    const mockError = Object.assign(new Error('Invalid image file'), { status: 400 });
    mockedPredictCataractFromImage.mockRejectedValue(mockError);

    const { result } = await renderHook(() => useImageAnalysis());

    await act(async () => {
      await result.current.analyzeImage(mockImage);
    });

    expect(useUploadWorkflowStore.getState().lastErrorCode).toBe('ANALYSIS_FAILED');
    expect(usePredictionStore.getState().pending).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith('/scan-result');
  });

  it('should handle API service timeout (503)', async () => {
    const mockUser: SessionUser = {
      id: 'user-123',
      email: 'test@example.com',
      bodyInsightCompleted: false,
    };

    useSessionStore.getState().setSession({
      accessToken: 'mock-access',
      refreshToken: 'mock-refresh',
      user: mockUser,
    });

    const mockError = Object.create(AxiosError.prototype);
    Object.assign(mockError, {
      message: 'AI service is temporarily unavailable',
      response: {
        status: 503,
        data: {
          message: 'AI service is temporarily unavailable'
        }
      },
      isAxiosError: true
    });
    mockedPredictCataractFromImage.mockRejectedValue(mockError);

    const { result } = await renderHook(() => useImageAnalysis());

    await act(async () => {
      await result.current.analyzeImage(mockImage);
    });

    expect(useUploadWorkflowStore.getState().lastErrorCode).toBe('UPLOAD_FAILED');
    expect(mockReplace).toHaveBeenCalledWith('/scan-result');
  });

  it('should handle offline network state prior to AI prediction dispatch', async () => {
    const mockUser: SessionUser = {
      id: 'user-123',
      email: 'test@example.com',
      bodyInsightCompleted: false,
    };

    useSessionStore.getState().setSession({
      accessToken: 'mock-access',
      refreshToken: 'mock-refresh',
      user: mockUser,
    });

    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({ isConnected: false });

    const { result } = await renderHook(() => useImageAnalysis());

    await act(async () => {
      await result.current.analyzeImage(mockImage);
    });

    expect(useUploadWorkflowStore.getState().lastErrorCode).toBe('NO_INTERNET');
    expect(useUploadWorkflowStore.getState().uploadStatus).toBe('failed');
    expect(mockReplace).toHaveBeenCalledWith('/scan-result');
  });
});

