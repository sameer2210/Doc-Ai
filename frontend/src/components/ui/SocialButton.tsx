import { Ionicons } from '@expo/vector-icons';
import React from 'react';

import { Button } from './Button';

interface SocialButtonProps {
  provider: 'apple' | 'google' | 'email';
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const SocialButton = ({ provider, onPress, isLoading, disabled }: SocialButtonProps) => {
  const content: Record<SocialButtonProps['provider'], { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
    google: { label: 'Continue with Google', icon: 'logo-google' },
    email: { label: 'Continue with Email', icon: 'mail-outline' },
    apple: { label: 'Continue with Apple', icon: 'logo-apple' },
  };

  const current = content[provider];

  return (
    <Button
      label={current.label}
      variant={provider === 'google' ? 'primary' : 'secondary'}
      onPress={onPress}
      isLoading={isLoading}
      disabled={disabled}
      icon={
        <Ionicons
          name={current.icon}
          size={18}
          color={provider === 'google' ? '#03112D' : '#EAF2FF'}
          style={{ marginRight: 8 }}
        />
      }
    />
  );
};
