import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/ui/GlassCard';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { useTheme } from '@/theme';

import {
  BAD_IMAGE_INSTRUCTIONS,
  CAPTURE_STEPS,
  GOOD_CAPTURE_ITEMS,
} from '../constants/instruction-data';
import type { InstructionItem } from '../types/instruction.types';

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * Hero section: premium healthcare-grade header with scan icon + messaging.
 */
const HeroCard = memo(() => {
  const { theme } = useTheme();
  const { colors, spacing, radii } = theme;

  return (
    <GlassCard
      style={[
        styles.heroCard,
        { borderColor: colors.border.subtle },
      ]}
      accessibilityRole="header"
    >
      {/* Icon cluster */}
      <View style={[styles.heroIconCluster, { backgroundColor: colors.accentSurface, borderRadius: radii.xl }]}>
        <Ionicons name="eye-outline" size={36} color={colors.accent.primary} accessibilityLabel="Eye" />
        <View style={[styles.heroIconBadge, { backgroundColor: colors.accent.primary, borderRadius: radii.full }]}>
          <Ionicons name="scan-outline" size={14} color={colors.background.base} />
        </View>
      </View>

      {/* Text */}
      <ThemeText
        variant="heading"
        style={[styles.heroTitle, { color: colors.text.primary, marginTop: spacing.md }]}
        allowFontScaling={true}
      >
        Capture a Clear Eye Image
      </ThemeText>
      <ThemeText
        variant="body"
        style={[styles.heroSubtitle, { color: colors.text.secondary, marginTop: spacing.xs }]}
        allowFontScaling={true}
      >
        Accurate eye images help the AI detect cataract indicators more reliably. Poor quality reduces
        screening accuracy.
      </ThemeText>

      {/* Divider */}
      <View style={[styles.heroDivider, { backgroundColor: colors.border.subtle, marginTop: spacing.md }]} />

      {/* Key indicators row */}
      <View style={[styles.heroIndicators, { marginTop: spacing.sm }]}>
        {[
          { icon: 'eye-outline' as const, label: 'Centered' },
          { icon: 'sunny-outline' as const, label: 'Well-lit' },
          { icon: 'camera-outline' as const, label: 'Focused' },
        ].map(({ icon, label }) => (
          <View key={label} style={styles.heroIndicatorItem} accessibilityLabel={label}>
            <Ionicons name={icon} size={16} color={colors.accent.primary} />
            <ThemeText variant="caption" style={[styles.heroIndicatorText, { color: colors.text.tertiary }]}>
              {label}
            </ThemeText>
          </View>
        ))}
      </View>
    </GlassCard>
  );
});
HeroCard.displayName = 'HeroCard';

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Section label — thin uppercase overline above section title.
 */
const SectionLabel = memo(({ label, title }: { label: string; title: string }) => {
  const { theme } = useTheme();
  const { colors, spacing } = theme;

  return (
    <View style={[styles.sectionLabelWrapper, { marginBottom: spacing.sm }]} accessibilityRole="header">
      <ThemeText
        variant="caption"
        style={[styles.sectionOverline, { color: colors.accent.primary }]}
        allowFontScaling={true}
      >
        {label}
      </ThemeText>
      <ThemeText
        variant="heading"
        style={[styles.sectionTitle, { color: colors.text.primary }]}
        allowFontScaling={true}
      >
        {title}
      </ThemeText>
    </View>
  );
});
SectionLabel.displayName = 'SectionLabel';

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 2-column grid of compact success checklist chips.
 */
const GoodCaptureGrid = memo(() => {
  const { theme } = useTheme();
  const { colors, spacing, radii } = theme;

  return (
    <View style={styles.goodGrid} accessibilityLabel="Good capture requirements">
      {GOOD_CAPTURE_ITEMS.map(({ id, icon, label }) => (
        <View
          key={id}
          style={[
            styles.goodChip,
            {
              backgroundColor: colors.successSurface,
              borderColor: colors.border.subtle,
              borderRadius: radii.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.sm,
            },
          ]}
          accessible={true}
          accessibilityLabel={label}
        >
          <Ionicons name={icon} size={18} color={colors.text.success} />
          <ThemeText
            variant="caption"
            style={[styles.goodChipLabel, { color: colors.text.success }]}
            allowFontScaling={true}
          >
            {label}
          </ThemeText>
        </View>
      ))}
    </View>
  );
});
GoodCaptureGrid.displayName = 'GoodCaptureGrid';

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Single "Things To Avoid" card — compact icon + title + description.
 * Uses contextual per-item icon, not a generic ✕.
 */
const AvoidCard = memo(({ item }: { item: InstructionItem }) => {
  const { theme } = useTheme();
  const { colors, spacing, radii } = theme;

  return (
    <View
      style={[
        styles.avoidCard,
        {
          backgroundColor: colors.errorSurface,
          borderColor: colors.errorBorder,
          borderRadius: radii.md,
          padding: spacing.sm,
        },
      ]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Avoid: ${item.title}. ${item.description}`}
    >
      <View style={[styles.avoidIconShell, { backgroundColor: colors.errorSurface, borderColor: colors.errorBorder, borderRadius: radii.md - 4 }]}>
        <Ionicons
          name={item.icon ?? 'close-circle-outline'}
          size={20}
          color={colors.text.danger}
        />
      </View>
      <ThemeText
        variant="caption"
        style={[styles.avoidTitle, { color: colors.text.danger }]}
        numberOfLines={1}
        allowFontScaling={true}
      >
        {item.title}
      </ThemeText>
      <ThemeText
        variant="caption"
        style={[styles.avoidDesc, { color: colors.text.secondary }]}
        numberOfLines={2}
        allowFontScaling={true}
      >
        {item.description}
      </ThemeText>
    </View>
  );
});
AvoidCard.displayName = 'AvoidCard';

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 2-column grid of AvoidCards.
 */
const AvoidGrid = memo(() => {
  const { theme } = useTheme();

  return (
    <View style={[styles.avoidGrid, { gap: theme.spacing.sm }]} accessibilityLabel="Things to avoid">
      {BAD_IMAGE_INSTRUCTIONS.map((item) => (
        <AvoidCard key={item.id} item={item} />
      ))}
    </View>
  );
});
AvoidGrid.displayName = 'AvoidGrid';

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vertical timeline stepper for the capture guide.
 */
const CaptureSteps = memo(() => {
  const { theme } = useTheme();
  const { colors, spacing, radii } = theme;
  const lastIndex = CAPTURE_STEPS.length - 1;

  return (
    <View accessibilityLabel="Capture guide steps">
      {CAPTURE_STEPS.map(({ step, title, detail }, index) => {
        const isLast = index === lastIndex;
        return (
          <View key={step} style={styles.stepRow}>
            {/* Left: number bubble + connecting line */}
            <View style={styles.stepLeft}>
              <View
                style={[
                  styles.stepBubble,
                  {
                    backgroundColor: colors.accentSurface,
                    borderColor: colors.accent.primary,
                    borderRadius: radii.full,
                  },
                ]}
                accessible={true}
                accessibilityLabel={`Step ${step}`}
              >
                <ThemeText
                  variant="caption"
                  style={[styles.stepNumber, { color: colors.accent.primary }]}
                >
                  {step}
                </ThemeText>
              </View>
              {!isLast && (
                <View style={[styles.stepLine, { backgroundColor: colors.border.soft }]} />
              )}
            </View>

            {/* Right: text content */}
            <View style={[styles.stepContent, { paddingBottom: isLast ? 0 : spacing.lg }]}>
              <ThemeText
                variant="heading"
                style={[styles.stepTitle, { color: colors.text.primary }]}
                allowFontScaling={true}
              >
                {title}
              </ThemeText>
              <ThemeText
                variant="caption"
                style={[styles.stepDetail, { color: colors.text.secondary }]}
                allowFontScaling={true}
              >
                {detail}
              </ThemeText>
            </View>
          </View>
        );
      })}
    </View>
  );
});
CaptureSteps.displayName = 'CaptureSteps';

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function ImageInstructionsScreen() {
  const { theme } = useTheme();
  const { colors, spacing, radii } = theme;

  const headerOptions = {
    headerShown: true,
    headerTitle: 'Image Guidelines',
    headerBackTitleVisible: false,
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor: colors.background.base,
    },
    headerTintColor: colors.text.primary,
    headerTitleStyle: {
      fontWeight: '600' as const,
      fontSize: 17,
    },
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background.base }]}
      edges={['bottom']}
    >
      <ScreenBackground />
      <Stack.Screen options={headerOptions} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xxl },
        ]}
      >
        {/* ── SECTION 1: Hero ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(380)}>
          <HeroCard />
        </Animated.View>

        {/* ── SECTION 2: Good Capture Checklist ───────────────────────── */}
        <Animated.View entering={FadeInDown.duration(400).delay(60)}>
          <View style={{ marginTop: spacing.xl }}>
            <SectionLabel label="Requirements" title="Good Capture Checklist" />
            <GlassCard style={[styles.sectionCard, { borderColor: colors.border.subtle }]}>
              <GoodCaptureGrid />
            </GlassCard>
          </View>
        </Animated.View>

        {/* ── SECTION 3: Things To Avoid ──────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(400).delay(120)}>
          <View style={{ marginTop: spacing.xl }}>
            <SectionLabel label="Common Mistakes" title="Things To Avoid" />
            <AvoidGrid />
          </View>
        </Animated.View>

        {/* ── SECTION 4: Capture Steps (replaces Crop Guide) ──────────── */}
        <Animated.View entering={FadeInDown.duration(400).delay(180)}>
          <View style={{ marginTop: spacing.xl }}>
            <SectionLabel label="Step-by-Step" title="Capture Guide" />
            <GlassCard
              style={[
                styles.sectionCard,
                { borderColor: colors.border.subtle, paddingTop: spacing.md },
              ]}
            >
              <CaptureSteps />
            </GlassCard>
          </View>
        </Animated.View>

        {/* ── Footer disclaimer ────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(400).delay(220)}>
          <View
            style={[
              styles.disclaimer,
              {
                marginTop: spacing.xl,
                backgroundColor: colors.warningSurface,
                borderColor: colors.border.subtle,
                borderRadius: radii.md,
                padding: spacing.md,
              },
            ]}
            accessible={true}
            accessibilityLabel="Medical disclaimer"
          >
            <View style={styles.disclaimerRow}>
              <Ionicons name="information-circle-outline" size={16} color={colors.text.warning} />
              <ThemeText
                variant="caption"
                style={[styles.disclaimerText, { color: colors.text.warning, marginLeft: spacing.xs }]}
                allowFontScaling={true}
              >
                For screening assistance only. Final diagnosis must be confirmed by a qualified ophthalmologist.
              </ThemeText>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    // Padding applied inline via theme.spacing tokens
  },

  // Hero
  heroCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  heroIconCluster: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 300,
  },
  heroDivider: {
    height: 1,
    alignSelf: 'stretch',
  },
  heroIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignSelf: 'stretch',
  },
  heroIndicatorItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
    minHeight: 44, // a11y touch target
    justifyContent: 'center',
  },
  heroIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Section labels
  sectionLabelWrapper: {},
  sectionOverline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Section card wrapper
  sectionCard: {},

  // Good capture grid
  goodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goodChip: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    borderWidth: 1,
  },
  goodChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // Avoid grid
  avoidGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  avoidCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    gap: 4,
    minHeight: 100,
  },
  avoidIconShell: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  avoidTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  avoidDesc: {
    fontSize: 11,
    lineHeight: 15,
  },

  // Capture steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepLeft: {
    alignItems: 'center',
    width: 32,
    marginRight: 12,
  },
  stepBubble: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepLine: {
    width: 1.5,
    flex: 1,
    minHeight: 16,
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  stepDetail: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },

  // Disclaimer
  disclaimer: {
    borderWidth: 1,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
});
