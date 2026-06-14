import React from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemeBadge, ThemeSurface, ThemeText } from '@/components/ui/theme';
import { useTheme } from '@/theme';

interface ExampleGridProps {
  readonly type: 'good' | 'bad' | 'crop';
}

const GRID_CONFIG = {
  good: {
    badgeLabel: 'Good Examples',
    badgeVariant: 'success' as const,
    titleColorKey: 'success' as const,
    count: 2,
  },
  bad: {
    badgeLabel: 'Bad Examples',
    badgeVariant: 'error' as const,
    titleColorKey: 'danger' as const,
    count: 2,
  },
  crop: {
    badgeLabel: 'Crop Example',
    badgeVariant: 'info' as const,
    titleColorKey: 'secondary' as const,
    count: 1,
  },
};

export const ExampleGrid = React.memo(({ type }: ExampleGridProps) => {
  const { theme } = useTheme();
  const config = GRID_CONFIG[type];
  
  const labelColor =
    config.titleColorKey === 'success'
      ? theme.colors.text.success
      : config.titleColorKey === 'danger'
        ? theme.colors.text.danger
        : theme.colors.text.secondary;

  const borderColor =
    type === 'bad'
      ? theme.colors.errorBorder
      : theme.colors.border.subtle;

  return (
    <View style={styles.container}>
      <ThemeBadge label={config.badgeLabel} variant={config.badgeVariant} size="sm" />

      <View style={styles.grid}>
        {Array.from({ length: config.count }, (_, index) => (
          <ThemeSurface
            key={`${type}-${index}`}
            variant="surface"
            style={[
              styles.placeholder,
              {
                borderColor,
              },
            ]}
          >
            <ThemeText
              variant="caption"
              style={[styles.placeholderText, { color: labelColor }]}
              allowFontScaling={true}
            >
              {type === 'crop' ? 'Crop Preview' : `Example ${index + 1}`}
            </ThemeText>
          </ThemeSurface>
        ))}
      </View>
    </View>
  );
});

ExampleGrid.displayName = 'ExampleGrid';

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 20,
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  placeholder: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.85,
  },
});
