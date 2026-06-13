import { Ionicons } from '@expo/vector-icons';
import React from 'react';

import { useTheme } from '@/theme';
import { Button } from './Button';

interface SocialButtonProps {
  provider: 'apple' | 'google' | 'email';
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const SocialButton = ({ provider, onPress, isLoading, disabled }: SocialButtonProps) => {
  const { isDark } = useTheme();

  const content: Record<
    SocialButtonProps['provider'],
    { label: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    google: { label: 'Continue with Google', icon: 'logo-google' },
    email: { label: 'Continue with Email', icon: 'mail-outline' },
    apple: { label: 'Continue with Apple', icon: 'logo-apple' },
  };

  const current = content[provider];

  // Specific override for Google button in Light Theme
  const isGoogleLight = provider === 'google' && !isDark;

  const buttonStyle = isGoogleLight
    ? {
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(140, 107, 62, 0.15)',
        shadowColor: '#8C6B3E',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 1,
      }
    : undefined;

  const textStyle = isGoogleLight ? { color: '#111827' } : undefined;

  const iconColor = isDark
    ? provider === 'google'
      ? '#03112D'
      : '#EAF2FF'
    : provider === 'google'
      ? '#111827'
      : '#111827'; // Secondary variants text color is #111827 in Light Theme

  return (
    <Button
      label={current.label}
      variant={provider === 'google' ? 'primary' : 'secondary'}
      onPress={onPress}
      isLoading={isLoading}
      disabled={disabled}
      style={buttonStyle}
      textStyle={textStyle}
      icon={
        <Ionicons
          name={current.icon}
          size={18}
          color={iconColor}
          style={{ marginRight: 8 }}
        />
      }
    />
  );
};
