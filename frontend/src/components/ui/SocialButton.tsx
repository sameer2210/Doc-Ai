import React from 'react';
import { Button } from './Button';

interface SocialButtonProps {
  provider: 'apple' | 'google' | 'x' | 'email';
  onPress: () => void;
  isLoading?: boolean;
}

export const SocialButton = ({ provider, onPress, isLoading }: SocialButtonProps) => {
  const labels: Record<SocialButtonProps['provider'], string> = {
    x: 'Continue with X',
    email: 'Continue with email',
    google: 'Continue with Google',
    apple: 'Continue with Apple',
  };

  const isPrimary = provider === 'x';

  return (
    <Button
      label={labels[provider]}
      variant={isPrimary ? 'primary' : 'secondary'}
      onPress={onPress}
      isLoading={isLoading}
      className={isPrimary ? undefined : 'h-14 rounded-[28px]'}
    />
  );
};
