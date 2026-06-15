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
  const { theme, isDark } = useTheme();
  const { colors } = theme;

  const content: Record<
    SocialButtonProps['provider'],
    { label: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    google: { label: 'Continue with Google', icon: 'logo-google' },
    email: { label: 'Continue with Email', icon: 'mail-outline' },
    apple: { label: 'Continue with Apple', icon: 'logo-apple' },
  };

  const current = content[provider];
  const isGooglePrimary = provider === 'google';

  // Google (primary variant): icon sits on the accent.primary background
  // In dark mode: accent.primary is a bright blue → use background.base (dark) for contrast
  // In light mode: accent.primary is muted gold → use background.elevated (white) for contrast
  const googleIconColor = isDark ? colors.background.base : colors.background.elevated;

  // Secondary variants (email, apple): icon sits on surfaceStrong background → use text.primary
  const secondaryIconColor = colors.text.primary;

  const iconColor = isGooglePrimary ? googleIconColor : secondaryIconColor;

  // Light-mode Google button override: white card with subtle gold border
  const buttonStyle = !isDark && isGooglePrimary
    ? {
        backgroundColor: colors.background.elevated,
        borderColor: colors.border.soft,
        shadowColor: colors.shadowColor,
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 } as const,
        shadowRadius: 4,
        elevation: 1,
      }
    : undefined;

  // Light-mode Google button: text should be dark (primary text)
  const textStyle = !isDark && isGooglePrimary ? { color: colors.text.primary } : undefined;

  return (
    <Button
      label={current.label}
      variant={isGooglePrimary ? 'primary' : 'secondary'}
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
