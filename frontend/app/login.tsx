import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import LoginScreen from '@/components/common/login';

export default function LoginRouteScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();

  useEffect(() => {
    if (from !== 'home') {
      router.replace('/');
    }
  }, [from]);

  if (from !== 'home') {
    return null;
  }

  return (
    <LoginScreen
      mode="login"
      onContinueToChat={() => {
        router.replace('/(tabs)');
      }}
      onSwitchMode={() => {
        router.replace('/signup?from=home');
      }}
    />
  );
}
