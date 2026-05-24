import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { appTheme } from '@/theme';

type GlassCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  className?: string;
}>;

export function GlassCard({ children, style, className }: GlassCardProps) {
  return (
    <View
      className={className}
      style={[
        {
          borderRadius: appTheme.radii.xl,
          borderWidth: 1,
          borderColor: appTheme.colors.border.subtle,
          backgroundColor: appTheme.colors.background.surface,
          padding: appTheme.spacing.md,
          shadowColor: '#000000',
          shadowOpacity: 0.28,
          shadowOffset: { width: 0, height: 16 },
          shadowRadius: 24,
          elevation: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
