import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { useTheme } from '@/theme';

type QuestionCardProps = {
  readonly title: string;
  readonly description: string;
  readonly value: boolean | null;
  readonly onChange: (val: boolean) => void;
};

type AnswerButtonProps = {
  readonly label: 'Yes' | 'No';
  readonly iconName: 'checkmark-circle' | 'close-circle';
  readonly isSelected: boolean;
  readonly onPress: () => void;
};

/**
 * Single Yes/No answer button — selected state is driven entirely by theme tokens.
 * No isDark branching; the theme layer handles light/dark colour resolution.
 */
const AnswerButton = React.memo(({ label, iconName, isSelected, onPress }: AnswerButtonProps) => {
  const { theme } = useTheme();
  const { colors, spacing, radii } = theme;

  const backgroundColor = isSelected ? colors.accent.primary : colors.inputBackground;
  const borderColor = isSelected ? colors.accent.primary : colors.border.soft;
  const textColor = isSelected ? colors.accentButtonText : colors.text.secondary;
  const iconColor = isSelected ? colors.accentButtonText : colors.text.tertiary;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          borderRadius: radii.md,
          paddingVertical: spacing.sm,
          gap: spacing.xs,
        },
      ]}
    >
      <Ionicons name={iconName} size={18} color={iconColor} />
      <ThemeText
        style={[styles.buttonText, { color: textColor }]}
        allowFontScaling={true}
      >
        {label}
      </ThemeText>
    </PressableScale>
  );
});

AnswerButton.displayName = 'AnswerButton';

// ─────────────────────────────────────────────────────────────────────────────

export const QuestionCard = React.memo(({
  title,
  description,
  value,
  onChange,
}: QuestionCardProps) => {
  const { theme } = useTheme();
  const { colors, spacing } = theme;

  const handleYes = useCallback(() => onChange(true), [onChange]);
  const handleNo = useCallback(() => onChange(false), [onChange]);

  return (
    <GlassCard
      style={[styles.card, { marginBottom: spacing.sm }]}
      accessibilityRole="none"
    >
      {/* Question text block */}
      <View style={[styles.textBlock, { marginBottom: spacing.sm }]}>
        <ThemeText
          variant="heading"
          style={[styles.title, { color: colors.text.primary }]}
          allowFontScaling={true}
        >
          {title}
        </ThemeText>
        <ThemeText
          variant="body"
          style={[styles.description, { color: colors.text.secondary }]}
          allowFontScaling={true}
        >
          {description}
        </ThemeText>
      </View>

      {/* Answer buttons */}
      <View style={[styles.actions, { gap: spacing.sm }]}>
        <AnswerButton
          label="Yes"
          iconName="checkmark-circle"
          isSelected={value === true}
          onPress={handleYes}
        />
        <AnswerButton
          label="No"
          iconName="close-circle"
          isSelected={value === false}
          onPress={handleNo}
        />
      </View>
    </GlassCard>
  );
});

QuestionCard.displayName = 'QuestionCard';

const styles = StyleSheet.create({
  card: {
    // padding and marginBottom applied inline via theme tokens
  },
  textBlock: {
    gap: 4,
    // marginBottom applied inline
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    // gap applied inline
  },
  button: {
    flex: 1,
    minHeight: 44, // a11y minimum touch target
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    // borderRadius, paddingVertical, gap applied inline
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
