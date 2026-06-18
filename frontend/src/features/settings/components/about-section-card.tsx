import React from 'react';
import { StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { useTheme } from '@/theme';

export interface AboutSectionCardProps {
  title: string;
  items: readonly string[];
}

export function AboutSectionCard({ title, items }: AboutSectionCardProps) {
  const { theme } = useTheme();

  return (
    <GlassCard style={styles.card}>
      <ThemeText
        variant="heading"
        style={[styles.title, { color: theme.colors.text.primary }]}
      >
        {title}
      </ThemeText>
      <View style={styles.listContainer}>
        {items.map((item, index) => (
          <View key={index} style={styles.bulletRow}>
            <ThemeText
              style={[styles.bulletPoint, { color: theme.colors.accent.primary }]}
            >
              •
            </ThemeText>
            <ThemeText
              style={[styles.itemText, { color: theme.colors.text.secondary }]}
              variant="body"
            >
              {item}
            </ThemeText>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  listContainer: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletPoint: {
    fontSize: 16,
    marginRight: 8,
    lineHeight: 22,
  },
  itemText: {
    flex: 1,
    lineHeight: 22,
  },
});
