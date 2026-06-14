import React from 'react';
import { View, StyleSheet } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeBadge, ThemeDivider, ThemeText } from '@/components/ui/theme';
import { useTheme } from '@/theme';
import { ChecklistItem } from './checklist-item';

const CROP_GUIDE_RULES = [
  'Eye centered',
  'Entire iris visible',
  'No eyelid obstruction',
  'No heavy shadows',
  'Maintain sharp focus',
];

export const CropGuideCard = React.memo(() => {
  const { theme, isDark } = useTheme();

  return (
    <GlassCard
      style={[
        styles.card,
        {
          backgroundColor: isDark ? theme.colors.background.surface : theme.colors.background.elevated,
        },
      ]}
    >
      <View style={styles.header}>
        <ThemeBadge label="Crop Guide" variant="info" size="sm" />
        <ThemeText variant="heading" style={styles.title}>
          Crop Guidelines
        </ThemeText>
      </View>

      <ThemeDivider spacing={10} />

      <View style={styles.list}>
        {CROP_GUIDE_RULES.map((rule) => (
          <ChecklistItem key={rule} label={rule} variant="success" />
        ))}
      </View>
    </GlassCard>
  );
});

CropGuideCard.displayName = 'CropGuideCard';

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  header: {
    gap: 6,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  list: {
    gap: 4,
  },
});
