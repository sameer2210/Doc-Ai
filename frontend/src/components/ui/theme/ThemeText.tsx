import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface ThemeTextProps extends TextProps {
  variant?: 'title' | 'heading' | 'body' | 'caption' | 'label' | 'success' | 'warning' | 'error';
  className?: string;
}

export function ThemeText({
  variant = 'body',
  style,
  className,
  children,
  ...props
}: ThemeTextProps) {
  const { theme } = useTheme();

  const getVariantStyle = (): TextStyle => {
    switch (variant) {
      case 'title':
        return {
          fontFamily: 'SpaceGrotesk_700Bold',
          fontSize: 32,
          fontWeight: '900',
          color: theme.colors.text.primary,
        };
      case 'heading':
        return {
          fontFamily: 'SpaceGrotesk_700Bold',
          fontSize: 20,
          fontWeight: '700',
          color: theme.colors.text.primary,
        };
      case 'body':
        return {
          fontFamily: 'Inter_400Regular',
          fontSize: 14,
          fontWeight: '400',
          lineHeight: 22,
          color: theme.colors.text.primary,
        };
      case 'caption':
        return {
          fontFamily: 'Inter_400Regular',
          fontSize: 12,
          fontWeight: '400',
          lineHeight: 18,
          color: theme.colors.text.secondary,
        };
      case 'label':
        return {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: theme.colors.text.secondary,
        };
      case 'success':
        return {
          fontFamily: 'Inter_500Medium',
          fontSize: 14,
          fontWeight: '600',
          color: theme.colors.text.success,
        };
      case 'warning':
        return {
          fontFamily: 'Inter_500Medium',
          fontSize: 14,
          fontWeight: '600',
          color: theme.colors.text.warning,
        };
      case 'error':
        return {
          fontFamily: 'Inter_500Medium',
          fontSize: 14,
          fontWeight: '600',
          color: theme.colors.text.danger,
        };
      default:
        return {};
    }
  };

  return (
    <Text
      className={className}
      style={[getVariantStyle(), style]}
      {...props}
    >
      {children}
    </Text>
  );
}
