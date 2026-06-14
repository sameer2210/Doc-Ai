import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { ThemeText } from '@/components/ui/theme';
import { useTheme } from '@/theme';

export const AiSummaryCard = React.memo(() => {
  const { theme, isDark } = useTheme();

  const handlePress = () => {
    router.push('/(tabs)/chat');
  };

  return (
    <PressableScale
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="AI Report Assistant. Need help understanding your cataract screening results? Ask Spanda AI to explain findings, risks, recommendations and next steps. Continue With AI."
      style={styles.pressable}
    >
      <GlassCard
        style={[
          styles.card,
          {
            backgroundColor: isDark ? theme.colors.background.surface : theme.colors.background.elevated,
            borderColor: theme.colors.border.subtle,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={[styles.iconWrapper, { backgroundColor: theme.colors.accentSurface }]}>
            <Ionicons name="sparkles-outline" size={18} color={theme.colors.accent.primary} />
          </View>
          <ThemeText variant="heading" style={styles.title} allowFontScaling={true}>
            AI Report Assistant
          </ThemeText>
        </View>

        <ThemeText
          variant="body"
          style={[styles.subtitle, { color: theme.colors.text.primary }]}
          allowFontScaling={true}
        >
          Need help understanding your cataract screening results?
        </ThemeText>

        <ThemeText
          variant="caption"
          style={[styles.description, { color: theme.colors.text.secondary }]}
          allowFontScaling={true}
        >
          Ask Spanda AI to explain findings, risks, recommendations and next steps.
        </ThemeText>

        <View style={styles.ctaRow}>
          <ThemeText
            style={[styles.ctaText, { color: theme.colors.accent.primary }]}
            allowFontScaling={true}
          >
            Continue With AI
          </ThemeText>
          <Ionicons name="arrow-forward" size={16} color={theme.colors.accent.primary} />
        </View>
      </GlassCard>
    </PressableScale>
  );
});

AiSummaryCard.displayName = 'AiSummaryCard';

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 4,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 8,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
