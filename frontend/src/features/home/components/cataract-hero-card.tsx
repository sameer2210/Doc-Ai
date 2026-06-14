import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ThemeBadge } from '@/components/ui/theme/ThemeBadge';
import { PressableScale } from '@/components/ui/PressableScale';

interface CataractHeroCardProps {
  readonly onPress: () => void;
}

export const CataractHeroCard = React.memo(({ onPress }: CataractHeroCardProps) => {
  const { theme, isDark } = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Start Cataract Detection Scan. Upload an eye image and receive AI-powered screening within seconds."
      style={styles.pressable}
    >
      <GlassCard style={styles.card}>
        {/* Top: AI Workspace Badge */}
        <View style={styles.badgeContainer}>
          <ThemeBadge label="AI Workspace" variant="info" size="sm" />
        </View>

        {/* Middle: Title & Subtitle */}
        <View style={styles.middleContainer}>
          <ThemeText variant="heading" style={styles.title}>
            Cataract Detection
          </ThemeText>
          <ThemeText
            variant="body"
            style={[
              styles.subtitle,
              { color: isDark ? theme.colors.text.secondary : theme.colors.text.tertiary }
            ]}
          >
            Upload an eye image and receive AI-powered cataract screening within seconds.
          </ThemeText>
        </View>

        {/* Feature Row */}
        <View style={[styles.featuresRow, { borderColor: theme.colors.border.subtle }]}>
          <View style={styles.featureItem}>
            <Ionicons name="sparkles-outline" size={14} color={theme.colors.accent.primary} />
            <ThemeText variant="caption" style={styles.featureText}>
              AI Powered
            </ThemeText>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="flash-outline" size={14} color={theme.colors.accent.primary} />
            <ThemeText variant="caption" style={styles.featureText}>
              Fast Results
            </ThemeText>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.accent.primary} />
            <ThemeText variant="caption" style={styles.featureText}>
              Secure Analysis
            </ThemeText>
          </View>
        </View>

        {/* Bottom: Large CTA Row */}
        <View style={styles.ctaRow}>
          <ThemeText
            style={[
              styles.ctaText,
              { color: theme.colors.accent.primary }
            ]}
          >
            Start Cataract Scan
          </ThemeText>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.accent.primary} />
        </View>
      </GlassCard>
    </PressableScale>
  );
});

CataractHeroCard.displayName = 'CataractHeroCard';

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    marginBottom: 16,
  },
  card: {
    padding: 20,
    minHeight: 260,
    justifyContent: 'space-between',
  },
  badgeContainer: {
    alignItems: 'flex-start',
  },
  middleContainer: {
    marginVertical: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
