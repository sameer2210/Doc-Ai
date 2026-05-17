import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import AuthScreen from '@/components/common/AuthScreen';
import { useSessionStore } from '@/features/auth/store/session-store';

export default function LoginRouteScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const user = useSessionStore(state => state.user);
  const hydrated = useSessionStore(state => state.hydrated);

  useEffect(() => {
    if (hydrated && user) {
      router.replace(from || '/');
    }
  }, [hydrated, user, from]);

  if (!hydrated) return null;

  return (
    <AuthScreen
      mode="login"
      onContinueToChat={() => {
        router.replace('/');
      }}
      onSwitchMode={() => {
        router.replace('/signup');
      }}
    />
  );
}
