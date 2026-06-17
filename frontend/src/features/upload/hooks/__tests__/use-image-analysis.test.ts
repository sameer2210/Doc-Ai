import { renderHook, act } from '@testing-library/react-native';
import { useImageAnalysis } from '../use-image-analysis';
import { useSessionStore } from '@/features/auth/store/session-store';
import { usePredictionStore } from '@/store/prediction-store';
import { useChatStore } from '@/features/chat/store/chat-store';
import { useUploadWorkflowStore } from '../../store/upload-workflow-store';
import { predictCataractFromImage } from '@/services/ai';
import type { SessionUser } from '@/features/auth/types/auth-types';

jest.mock('@/services/ai');

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

  it('should return error if user is not logged in', async () => {
    const { result } = await renderHook(() => useImageAnalysis());

    await act(async () => {
      await result.current.analyzeImage(mockImage);
    });

    expect(result.current.analysisError).toEqual({
      title: 'Login required',
      message: 'Please login to run cataract detection.',
      actionLabel: 'Login',
      onAction: expect.any(Function),
    });

    act(() => {
      result.current.analysisError?.onAction?.();
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
    expect(useChatStore.getState().activeChatId).toBe('chat-456');

    expect(mockReplace).toHaveBeenCalledWith('/scan-result');
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

    expect(result.current.analysisError).toEqual({
      title: 'Analysis failed',
      message: 'Invalid image file',
    });
    expect(usePredictionStore.getState().pending).toBeNull();
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

    const mockError = Object.assign(new Error('AI service is temporarily unavailable'), {
      status: 503,
    });
    mockedPredictCataractFromImage.mockRejectedValue(mockError);

    const { result } = await renderHook(() => useImageAnalysis());

    await act(async () => {
      await result.current.analyzeImage(mockImage);
    });

    expect(result.current.analysisError).toEqual({
      title: 'Analysis failed',
      message: 'AI service is temporarily unavailable. Please try again later.',
    });
  });
});
