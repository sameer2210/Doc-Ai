import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { PropsWithChildren, useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
// import { KeyboardProvider } from 'react-native-keyboard-controller';

import { AuthSessionProvider } from '@/providers/auth-session-provider';
import { QueryProvider } from '@/providers/query-provider';

function useReactQueryReactNativeLifecycle() {
  useEffect(() => {
    onlineManager.setEventListener(setOnline => {
      let initialized = false;

      const subscription = Network.addNetworkStateListener(state => {
        initialized = true;
        setOnline(Boolean(state.isConnected));
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
    };

    const appStateSubscription = AppState.addEventListener('change', onAppStateChange);
    return () => {
      appStateSubscription.remove();
    };
  }, []);
}

export function AppProviders({ children }: PropsWithChildren) {
  useReactQueryReactNativeLifecycle();

  return (
    // <KeyboardProvider>
      <QueryProvider>
        <AuthSessionProvider>
          <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
        </AuthSessionProvider>
      </QueryProvider>
    // </KeyboardProvider>
  );
}
