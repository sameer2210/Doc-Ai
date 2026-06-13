import React from 'react';
import { View, Text, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface ThemeBadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function ThemeBadge({
  label,
  variant = 'neutral',
  size = 'md',
  icon,
  style,
  className,
}: ThemeBadgeProps) {
  const { theme } = useTheme();

  const badgeColors = {
    success: {
      bg: theme.colors.successSurface,
      border: theme.colors.border.subtle,
      text: theme.colors.text.success,
    },
    warning: {
      bg: theme.colors.warningSurface,
      border: theme.colors.border.subtle,
      text: theme.colors.accent.primary,
    },
    error: {
      bg: theme.colors.errorSurface,
      border: theme.colors.border.subtle,
      text: theme.colors.text.danger,
    },
    info: {
      bg: theme.colors.border.subtle,
      border: theme.colors.border.subtle,
      text: theme.colors.accent.secondary,
    },
    neutral: {
      bg: theme.colors.border.subtle,
      border: theme.colors.border.subtle,
      text: theme.colors.text.secondary,
    },
  }[variant];

  const layoutStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.bg,
    paddingHorizontal: size === 'sm' ? 8 : 12,
    paddingVertical: size === 'sm' ? 3 : 5,
    alignSelf: 'flex-start',
  };

  const textStyle: TextStyle = {
    fontSize: size === 'sm' ? 10 : 11,
    fontFamily: 'Inter_500Medium',
    fontWeight: '700',
    color: badgeColors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  };

  return (
    <View className={className} style={[layoutStyle, style]}>
      {icon && <View style={{ marginRight: 4 }}>{icon}</View>}
      <Text style={textStyle}>{label}</Text>
    </View>
  );
}
