import { useTheme } from '@/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: 'text' | 'background' | 'tint' | 'icon' | 'tabIconDefault' | 'tabIconSelected'
) {
  const { isDark, theme } = useTheme();
  const activeMode = isDark ? 'dark' : 'light';
  const colorFromProps = props[activeMode];

  if (colorFromProps) {
    return colorFromProps;
  }

  const flatColors = {
    text: theme.colors.text.primary,
    background: theme.colors.background.base,
    tint: theme.colors.accent.primary,
    icon: theme.colors.text.secondary,
    tabIconDefault: theme.colors.text.tertiary,
    tabIconSelected: theme.colors.accent.primary,
  } as const;

  return flatColors[colorName] || theme.colors.accent.primary;
}
