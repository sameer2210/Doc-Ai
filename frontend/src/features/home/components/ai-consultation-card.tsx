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
      accessibilityLabel="Chat with SpandaVidya AI. Ask questions, understand scan results, and receive personalized guidance."
      style={styles.pressable}
    >
      <GlassCard style={styles.card}>
        <View style={styles.contentRow}>
          <View style={styles.textContainer}>
            <ThemeText variant="heading" style={styles.title}>
              Chat with SpandaVidya AI
            </ThemeText>
            <ThemeText
              variant="body"
              style={[
                styles.description,
                { color: isDark ? theme.colors.text.secondary : theme.colors.text.tertiary }
              ]}
            >
              Ask questions, understand scan results, and receive personalized guidance.
            </ThemeText>
          </View>

          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isDark ? 'rgba(110, 168, 255, 0.12)' : 'rgba(36, 74, 133, 0.06)',
              }
            ]}
          >
            <Ionicons name="chatbubbles-outline" size={24} color={theme.colors.accent.primary} />
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
    padding: 16,
    minHeight: 120,
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  iconWrapper: {
    height: 48,
    width: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
