import React from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemeDivider, ThemeText } from '@/components/ui/theme';
import { useTheme } from '@/theme';

import { InstructionCategory } from '../types/instruction.types';
import { InstructionCard } from './instruction-card';

interface InstructionSectionProps {
  readonly category: InstructionCategory;
}

export const InstructionSection = React.memo(({ category }: InstructionSectionProps) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemeText variant="heading" style={styles.title}>
          {category.title}
        </ThemeText>
        {category.subtitle ? (
          <ThemeText variant="caption" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            {category.subtitle}
          </ThemeText>
        ) : null}
      </View>

      <ThemeDivider spacing={12} />

      <View style={styles.list}>
        {category.items.map((item) => (
          <InstructionCard key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
});

InstructionSection.displayName = 'InstructionSection';

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    marginBottom: 8,
    gap: 4,
  },
  title: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: 0,
  },
});
