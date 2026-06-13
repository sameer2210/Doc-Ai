import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface ThemeDividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function ThemeDivider({
  orientation = 'horizontal',
  spacing = 16,
  style,
  className,
}: ThemeDividerProps) {
  const { theme } = useTheme();

  const baseStyle: ViewStyle =
    orientation === 'horizontal'
      ? {
          height: 1,
          width: '100%',
          backgroundColor: theme.colors.border.subtle,
          marginVertical: spacing,
        }
      : {
          width: 1,
          height: '100%',
          backgroundColor: theme.colors.border.subtle,
          marginHorizontal: spacing,
        };

  return <View className={className} style={[baseStyle, style]} />;
}
