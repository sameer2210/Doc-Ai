import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface ThemeSurfaceProps {
  variant?: 'background' | 'surface' | 'elevated';
  style?: StyleProp<ViewStyle>;
  className?: string;
  children?: React.ReactNode;
}

export function ThemeSurface({
  variant = 'surface',
  style,
  className,
  children,
}: ThemeSurfaceProps) {
  const { theme } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'background':
        return {
          backgroundColor: theme.colors.background.base,
        };
      case 'surface':
        return {
          backgroundColor: theme.colors.background.surfaceStrong,
        };
      case 'elevated':
        return {
          backgroundColor: theme.colors.background.elevated,
        };
      default:
        return {};
    }
  };

  return (
    <View className={className} style={[getVariantStyle(), style]}>
      {children}
    </View>
  );
}
