import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, StyleSheet } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeText } from '@/components/ui/theme';
import { useTheme } from '@/theme';

import { InstructionItem } from '../types/instruction.types';

interface InstructionCardProps {
  readonly item: InstructionItem;
}

export const InstructionCard = React.memo(({ item }: InstructionCardProps) => {
  const { theme, isDark } = useTheme();
  const isNegative = item.isNegative ?? false;

  const cardBackground = isNegative
    ? theme.colors.errorSurface
    : isDark
      ? theme.colors.background.surface
      : theme.colors.background.elevated;
  const borderColor = isNegative ? theme.colors.errorBorder : theme.colors.border.subtle;
  const iconBackground = isNegative ? theme.colors.errorSurface : theme.colors.successSurface;
  const iconColor = isNegative ? theme.colors.text.danger : theme.colors.text.success;
  const iconName = item.icon ?? (isNegative ? 'close-circle-outline' : 'checkmark-circle-outline');

  return (
    <GlassCard
      style={[
        styles.card,
        {
          backgroundColor: cardBackground,
          borderColor,
        },
      ]}
      accessibilityRole="summary"
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconShell, { backgroundColor: iconBackground, borderColor }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
        <ThemeText
          variant="heading"
          style={styles.title}
          allowFontScaling={true}
        >
          {item.title}
        </ThemeText>
      </View>

      <ThemeText
        variant="caption"
        style={[styles.description, { color: theme.colors.text.secondary }]}
        allowFontScaling={true}
      >
        {item.description}
      </ThemeText>
    </GlassCard>
  );
});

InstructionCard.displayName = 'InstructionCard';

const styles = StyleSheet.create({
  card: {
    padding: 12,
    marginBottom: 8,
    minHeight: 72,
    justifyContent: 'center',
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  iconShell: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 52, // 40 (icon width) + 12 (gap)
  },
});
