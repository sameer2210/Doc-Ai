import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ResultActions } from '../../upload/components/result-actions';
import { usePredictionStore } from '@/store/prediction-store';
import { useChatStore } from '@/features/chat/store/chat-store';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Chat Handoff Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePredictionStore.getState().clearAll();
    useChatStore.getState().clearActiveChat();
  });

  it('should preserve prediction and set activeChatId correctly when Discuss is pressed', () => {
    const mockPrediction = {
      prediction: 'Immature_Cataract',
      confidence: 0.88,
      uploadedImageUrl: 'https://s3/image.png',
      chatId: 'chat-987',
    };

    usePredictionStore.getState().setPending(mockPrediction);
    useChatStore.getState().setActiveChatId(mockPrediction.chatId);

    const { getByText } = await render(<ResultActions prediction={mockPrediction} />);
    const discussButton = getByText('Discuss With SpandaVidya AI');

    fireEvent.press(discussButton);

    expect(useChatStore.getState().activeChatId).toBe('chat-987');
    expect(usePredictionStore.getState().pending).toEqual(mockPrediction);

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/chat');
  });
});
