import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import LoginScreen from '@/components/common/login';

export default function SignupRouteScreen() {
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
      mode="signup"
      onContinueToChat={() => {
        router.replace('/ml-survey');
      }}
      onSwitchMode={() => {
        router.replace('/login?from=home');
      }}
    />
  );
}
