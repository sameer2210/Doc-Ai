import { router } from 'expo-router';
import React from 'react';

import AuthScreen from '@/components/common/AuthScreen';

export default function SignupRouteScreen() {
  return (
    <AuthScreen
      mode="signup"
      onContinueToChat={() => {
        router.replace('/');
      }}
      onSwitchMode={() => {
        router.replace('/login');
      }}
    />
  );
}
