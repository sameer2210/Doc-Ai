import { renderHook } from '@testing-library/react-native';
import { useConsultationTrigger } from '../use-consultation-trigger';
import { usePredictionStore } from '@/store/prediction-store';
import { useStartConsultation } from '@/features/chat/hooks/use-send-message';

jest.mock('@/features/chat/hooks/use-send-message');

describe('useConsultationTrigger Hook', () => {
  const clearAttachments = jest.fn();
  const setChatError = jest.fn();
  const mockMutate = jest.fn();
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    usePredictionStore.getState().clearAll();
    (useStartConsultation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      reset: mockReset,
      isPending: false,
    });
  });

  it('should auto-trigger consultation if pending prediction is present and not yet sent', async () => {
    const prediction = {
      prediction: 'Immature_Cataract',
      confidence: 0.85,
      uploadedImageUrl: 'https://s3/pic.jpg',
      chatId: 'chat-123',
    };
    usePredictionStore.getState().setPending(prediction);

    await renderHook(() =>
      useConsultationTrigger({
        activeChatId: 'chat-123',
        clearAttachments,
        setChatError,
      })
    );

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      { prediction: 'Immature_Cataract', confidence: 0.85 },
      expect.any(Object)
    );

    // Call the success callback passed to mutate
    const successCallback = mockMutate.mock.calls[0][1].onSuccess;
    successCallback();

    expect(usePredictionStore.getState().pending).toBeNull();
    expect(clearAttachments).toHaveBeenCalled();
    expect(setChatError).toHaveBeenCalledWith(null);
  });

  it('should handle mutation error callback and retain pending prediction', async () => {
    const prediction = {
      prediction: 'Mature_Cataract',
      confidence: 0.95,
      uploadedImageUrl: 'https://s3/pic.jpg',
      chatId: 'chat-123',
    };
    usePredictionStore.getState().setPending(prediction);

    await renderHook(() =>
      useConsultationTrigger({
        activeChatId: 'chat-123',
        clearAttachments,
        setChatError,
      })
    );

    const errorCallback = mockMutate.mock.calls[0][1].onError;
    const testError = new Error('Rate limit exceeded');
    errorCallback(testError);

    // Should NOT clear prediction so user can retry manually
    expect(usePredictionStore.getState().pending).toEqual(prediction);
    expect(setChatError).toHaveBeenCalledWith(testError);
  });

  it('should NOT trigger consultation if already sent or in-flight', async () => {
    const prediction = {
      prediction: 'Normal',
      confidence: 0.99,
      uploadedImageUrl: 'https://s3/pic.jpg',
      chatId: 'chat-123',
    };
    usePredictionStore.getState().setPending(prediction);

    const { rerender } = await renderHook(() =>
      useConsultationTrigger({
        activeChatId: 'chat-123',
        clearAttachments,
        setChatError,
      })
    );

    expect(mockMutate).toHaveBeenCalledTimes(1);

    // Rerender should not call mutate again
    await rerender({});
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('should allow manual retry trigger via handleRetryConsultation', async () => {
    const prediction = {
      prediction: 'Immature_Cataract',
      confidence: 0.85,
      uploadedImageUrl: 'https://s3/pic.jpg',
      chatId: 'chat-123',
    };
    usePredictionStore.getState().setPending(prediction);

    const { result } = await renderHook(() =>
      useConsultationTrigger({
        activeChatId: 'chat-123',
        clearAttachments,
        setChatError,
      })
    );

    expect(mockMutate).toHaveBeenCalledTimes(1);

    // Call manual retry
    result.current.handleRetryConsultation();

    expect(mockReset).toHaveBeenCalled();
    expect(mockMutate).toHaveBeenCalledTimes(2);
  });
});
