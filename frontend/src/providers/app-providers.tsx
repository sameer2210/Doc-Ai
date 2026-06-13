import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { PropsWithChildren, useEffect, useRef } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { useSessionStore } from '@/features/auth/store/session-store';
import { abortActiveChatStreams } from '@/features/chat/api/chat-api';
import { AuthSessionProvider } from '@/providers/auth-session-provider';
import { QueryProvider } from '@/providers/query-provider';
import { queryClient } from '@/shared/api/query-client';

import { ThemeProvider } from '@/theme/ThemeProvider';

function useReactQueryReactNativeLifecycle() {
  useEffect(() => {
    onlineManager.setEventListener(setOnline => {
      let initialized = false;

      const subscription = Network.addNetworkStateListener(state => {
        initialized = true;
        const isOnline = Boolean(state.isConnected);
        setOnline(isOnline);
        if (isOnline && useSessionStore.getState().accessToken) {
          void queryClient.invalidateQueries({ refetchType: 'active' });
        }
      });

      void Network.getNetworkStateAsync()
        .then(state => {
          if (!initialized) {
            setOnline(Boolean(state.isConnected));
          }
        })
        .catch(() => {
          setOnline(true);
        });

      return () => subscription.remove();
    });

    const onAppStateChange = (status: AppStateStatus) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
      if (status === 'active' && useSessionStore.getState().accessToken) {
        void queryClient.resumePausedMutations();
        void queryClient.invalidateQueries({ refetchType: 'active' });
      }
      if (status === 'background' || status === 'inactive') {
        abortActiveChatStreams();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', onAppStateChange);
    return () => {
      appStateSubscription.remove();
    };
  }, []);
}

function useClearQueriesOnSessionLoss() {
  const accessToken = useSessionStore(state => state.accessToken);
  const hydrated = useSessionStore(state => state.hydrated);
  const previousAccessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const previousAccessToken = previousAccessTokenRef.current;
    previousAccessTokenRef.current = accessToken;

    if (hydrated && previousAccessToken && !accessToken) {
      queryClient.clear();
    }
  }, [accessToken, hydrated]);
}

export function AppProviders({ children }: PropsWithChildren) {
  useReactQueryReactNativeLifecycle();
  useClearQueriesOnSessionLoss();

  return (
    <ThemeProvider>
      <KeyboardProvider>
        <QueryProvider>
          <AuthSessionProvider>
            <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
          </AuthSessionProvider>
        </QueryProvider>
      </KeyboardProvider>
    </ThemeProvider>
  );
}
