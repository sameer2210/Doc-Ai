import type { PropsWithChildren } from 'react';
import { Platform, View, type StyleProp, type ViewStyle, type ViewProps } from 'react-native';

import { useTheme } from '@/theme';

type GlassCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  className?: string;
  accessibilityRole?: ViewProps['accessibilityRole'];
}>;

export function GlassCard({ children, style, className, accessibilityRole }: GlassCardProps) {
  const { theme, isDark } = useTheme();

  return (
    <View
      className={className}
      accessibilityRole={accessibilityRole}
      style={[
        {
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: theme.colors.border.subtle,
          backgroundColor: theme.colors.background.surface,
          padding: theme.spacing.md,
          ...Platform.select({
            web: {
              boxShadow: isDark
                ? '0px 16px 24px rgba(0, 0, 0, 0.28)'
                : '0px 8px 32px rgba(140, 107, 62, 0.04)',
            },
            default: {
              shadowColor: isDark ? '#000000' : '#8C6B3E',
              shadowOpacity: isDark ? 0.28 : 0.04,
              shadowOffset: isDark ? { width: 0, height: 16 } : { width: 0, height: 8 },
              shadowRadius: isDark ? 24 : 16,
              elevation: isDark ? 8 : 2,
            },
          }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
