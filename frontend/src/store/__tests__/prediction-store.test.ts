import { usePredictionStore } from '../prediction-store';

describe('Prediction Store', () => {
  beforeEach(() => {
    usePredictionStore.getState().clearAll();
  });

  it('should initialize with null state values', () => {
    const state = usePredictionStore.getState();
    expect(state.pending).toBeNull();
    expect(state.pendingMessage).toBeNull();
  });

  it('should set pending prediction result and persist it', () => {
    const result = {
      prediction: 'Immature',
      confidence: 0.87,
      uploadedImageUrl: 'https://s3/eye.png',
      chatId: 'chat-123',
    };

    usePredictionStore.getState().setPending(result);

    const state = usePredictionStore.getState();
    expect(state.pending).toEqual(result);
  });

  it('should set and clear pending message', () => {
    usePredictionStore.getState().setPendingMessage('Test message');
    expect(usePredictionStore.getState().pendingMessage).toBe('Test message');

    usePredictionStore.getState().setPendingMessage(null);
    expect(usePredictionStore.getState().pendingMessage).toBeNull();
  });

  it('should clear pending prediction', () => {
    const result = {
      prediction: 'Normal',
      confidence: 0.99,
      uploadedImageUrl: 'https://s3/eye2.png',
      chatId: 'chat-456',
    };

    usePredictionStore.getState().setPending(result);
    expect(usePredictionStore.getState().pending).toEqual(result);

    usePredictionStore.getState().clearPending();
    expect(usePredictionStore.getState().pending).toBeNull();
  });

  it('should clear all fields on clearAll', () => {
    const result = {
      prediction: 'Mature',
      confidence: 0.95,
      uploadedImageUrl: 'https://s3/eye3.png',
      chatId: 'chat-789',
    };

    usePredictionStore.getState().setPending(result);
    usePredictionStore.getState().setPendingMessage('Hi');

    usePredictionStore.getState().clearAll();

    const state = usePredictionStore.getState();
    expect(state.pending).toBeNull();
    expect(state.pendingMessage).toBeNull();
  });
});
