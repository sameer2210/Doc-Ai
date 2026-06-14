import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ThemeSurface } from '@/components/ui/theme/ThemeSurface';
import { PressableScale } from '@/components/ui/PressableScale';
import type { SmartSuggestion } from '../types/home.types';

export interface SmartSuggestionChipProps {
  readonly suggestion: SmartSuggestion;
  readonly onPress: () => void;
}

export const SmartSuggestionChip = React.memo(({ suggestion, onPress }: SmartSuggestionChipProps) => {
  const { theme, isDark } = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Suggestion: ${suggestion.label}`}
      style={[
        styles.chip,
        {
          borderColor: theme.colors.border.subtle,
          backgroundColor: theme.colors.background.surface,
        }
      ]}
    >
      <ThemeSurface
        variant="elevated"
        style={[
          styles.iconContainer,
          {
            backgroundColor: isDark ? 'rgba(22, 38, 60, 0.5)' : 'rgba(140, 107, 62, 0.08)',
          }
        ]}
      >
        <Ionicons
          name={suggestion.icon}
          size={14}
          color={isDark ? theme.colors.accent.primary : theme.colors.accent.mutedGold}
        />
      </ThemeSurface>
      <ThemeText
        style={[
          styles.labelText,
          { color: theme.colors.text.primary }
        ]}
        variant="body"
      >
        {suggestion.label}
      </ThemeText>
    </PressableScale>
  );
});

SmartSuggestionChip.displayName = 'SmartSuggestionChip';

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 10,
    minHeight: 44,
  },
  iconContainer: {
    height: 28,
    width: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
