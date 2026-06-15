import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { PressableScale } from '@/components/ui/PressableScale';

type QuestionCardProps = {
  readonly title: string;
  readonly description: string;
  readonly value: boolean | null;
  readonly onChange: (val: boolean) => void;
};

export const QuestionCard = React.memo(({
  title,
  description,
  value,
  onChange,
}: QuestionCardProps) => {
  const { theme, isDark } = useTheme();

  return (
    <GlassCard style={styles.card}>
      <View style={styles.textContainer}>
        <ThemeText variant="heading" style={styles.title}>
          {title}
        </ThemeText>
        <ThemeText
          variant="body"
          style={[
            styles.description,
            { color: isDark ? theme.colors.text.secondary : theme.colors.text.tertiary },
          ]}
        >
          {description}
        </ThemeText>
      </View>

      <View style={styles.actionsContainer}>
        <PressableScale
          onPress={() => onChange(true)}
          style={[
            styles.button,
            value === true
              ? {
                  backgroundColor: theme.colors.accent.primary,
                  borderColor: theme.colors.accent.primary,
                }
              : {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: theme.colors.border.subtle,
                },
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              {
                color: value === true
                  ? (isDark ? '#03112D' : '#FFFFFF')
                  : theme.colors.text.primary,
              },
            ]}
          >
            Yes
          </Text>
        </PressableScale>

        <PressableScale
          onPress={() => onChange(false)}
          style={[
            styles.button,
            value === false
              ? {
                  backgroundColor: theme.colors.accent.primary,
                  borderColor: theme.colors.accent.primary,
                }
              : {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: theme.colors.border.subtle,
                },
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              {
                color: value === false
                  ? (isDark ? '#03112D' : '#FFFFFF')
                  : theme.colors.text.primary,
              },
            ]}
          >
            No
          </Text>
        </PressableScale>
      </View>
    </GlassCard>
  );
});

QuestionCard.displayName = 'QuestionCard';

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 14,
  },
  textContainer: {
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
