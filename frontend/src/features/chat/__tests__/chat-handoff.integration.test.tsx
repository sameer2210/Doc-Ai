import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ResultActions } from '../../upload/components/result-actions';
import { usePredictionStore } from '@/store/prediction-store';
import { useChatStore } from '@/features/chat/store/chat-store';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
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

describe('Chat Handoff Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePredictionStore.getState().clearAll();
    useChatStore.getState().clearActiveChat();
  });

  it('sets activeChatId from the prediction result and enables auto consultation on Discuss', async () => {
    const mockPrediction = {
      prediction: 'Immature_Cataract',
      confidence: 0.88,
      uploadedImageUrl: 'https://s3/image.png',
      chatId: 'chat-987',
    };

    usePredictionStore.getState().setPending(mockPrediction, false);
    useChatStore.getState().setActiveChatId('chat-old');

    const { getByText } = await render(<ResultActions prediction={mockPrediction} />);
    const discussButton = getByText('Discuss With SpandaVidya AI');

    await act(async () => {
      fireEvent.press(discussButton);
    });

    expect(useChatStore.getState().activeChatId).toBe('chat-987');
    expect(usePredictionStore.getState().shouldAutoConsult).toBe(true);
    expect(usePredictionStore.getState().pending).toEqual(mockPrediction);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/chat');
  });
});
