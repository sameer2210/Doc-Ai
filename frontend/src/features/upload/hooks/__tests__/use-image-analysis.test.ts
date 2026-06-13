import { renderHook, act } from '@testing-library/react-native';
import { useImageAnalysis } from '../use-image-analysis';
import { useSessionStore } from '@/features/auth/store/session-store';
import { usePredictionStore } from '@/store/prediction-store';
import { useChatStore } from '@/features/chat/store/chat-store';
import { useUploadWorkflowStore } from '../../store/upload-workflow-store';
import { predictCataractFromImage } from '@/services/ai';

jest.mock('@/services/ai');

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
    const { result } = renderHook(() => useImageAnalysis());

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
    useSessionStore.getState().setSession({
      accessToken: 'mock-access',
      refreshToken: 'mock-refresh',
      user: { id: 'user-123', email: 'test@example.com', role: 'USER' } as any,
    });

    const mockPredictResult = {
      prediction: 'Immature',
      confidence: 0.87,
      uploadedImageUrl: 'https://s3/uploaded.png',
      chatId: 'chat-456',
    };
    (predictCataractFromImage as jest.Mock).mockResolvedValue(mockPredictResult);

    const { result } = renderHook(() => useImageAnalysis());

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
    useSessionStore.getState().setSession({
      accessToken: 'mock-access',
      refreshToken: 'mock-refresh',
      user: { id: 'user-123', email: 'test@example.com', role: 'USER' } as any,
    });

    const mockError = new Error('Invalid image file');
    (mockError as any).status = 400;
    (predictCataractFromImage as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useImageAnalysis());

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
    useSessionStore.getState().setSession({
      accessToken: 'mock-access',
      refreshToken: 'mock-refresh',
      user: { id: 'user-123', email: 'test@example.com', role: 'USER' } as any,
    });

    const mockError = new Error('AI service is temporarily unavailable');
    (mockError as any).status = 503;
    (predictCataractFromImage as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useImageAnalysis());

    await act(async () => {
      await result.current.analyzeImage(mockImage);
    });

    expect(result.current.analysisError).toEqual({
      title: 'Analysis failed',
      message: 'AI service is temporarily unavailable. Please try again later.',
    });
  });
});
