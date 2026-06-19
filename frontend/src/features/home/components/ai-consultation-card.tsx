import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { PressableScale } from '@/components/ui/PressableScale';

interface AiConsultationCardProps {
  readonly onPress: () => void;
}

export const AiConsultationCard = React.memo(({ onPress }: AiConsultationCardProps) => {
  const { theme, isDark } = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Start AI consultation"
      style={styles.pressable}
    >
      <GlassCard style={styles.card}>
        <View style={styles.contentRow}>
          <View style={styles.textContainer}>
            <ThemeText variant="heading" style={styles.title}>
              Ask Spanda AI
            </ThemeText>

            <ThemeText
              variant="body"
              style={[
                styles.description,
                {
                  color: isDark ? theme.colors.text.secondary : theme.colors.text.tertiary,
                },
              ]}
            >
              Understand scan results, explore possible risks, and receive guidance tailored to your
              eye health.
            </ThemeText>

            <View style={styles.ctaRow}>
              <ThemeText style={[styles.ctaText, { color: theme.colors.accent.primary }]}>
                Start Conversation
              </ThemeText>

              <Ionicons name="arrow-forward" size={18} color={theme.colors.accent.primary} />
            </View>
          </View>

          <View
            style={[
              styles.arrowContainer,
              {
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={24}
              color={theme.colors.accent.primary}
            />
          </View>
        </View>
      </GlassCard>
    </PressableScale>
  );
});

AiConsultationCard.displayName = 'AiConsultationCard';

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    marginBottom: 16,
  },

  card: {
    padding: 24,
    minHeight: 140,
    justifyContent: 'center',
  },

  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },

  textContainer: {
    flex: 1,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
  },

  description: {
    fontSize: 14,
    lineHeight: 22,
  },

  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },

  ctaText: {
    fontSize: 14,
    fontWeight: '600',
  },

  arrowContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
