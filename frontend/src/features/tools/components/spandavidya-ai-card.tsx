import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { Button } from '@/components/ui/Button';
import { ThemeBadge, ThemeDivider, ThemeText } from '@/components/ui/theme';
import { useTheme } from '@/theme';

import { type ToolItem } from '../constants/tools';
import { openInfantMindWebsite } from '../utils/open-infant-mind-website';

interface SpandaVidyaAiCardProps {
  readonly item: ToolItem;
}

/**
 * Decorative low-opacity (5-12%) baby-themed vector illustration overlay.
 * Renders subtle baby footprints, rattle, sleeping moon, stars, pacifier, and bottle.
 */

/* Decorative background shapes for baby elements */
function BabyBackgroundIllustrations({ color }: { color: string }) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg height="100%" width="100%" viewBox="0 0 340 420" style={StyleSheet.absoluteFillObject}>
        <G stroke={color} strokeWidth="1.5" fill="none" opacity={1}>
          {/* Sleeping Moon & Stars (Top Right) */}
          <Path d="M 285 28 A 22 22 0 1 1 267 56 A 18 18 0 0 0 285 28 Z" fill={color} />
          {/* Star 1 */}
          <Path d="M 310 32 L 312 37 L 317 39 L 312 41 L 310 46 L 308 41 L 303 39 L 308 37 Z" fill={color} />
          {/* Star 2 */}
          <Path d="M 250 18 L 251 21 L 254 22 L 251 23 L 250 26 L 249 23 L 246 22 L 249 21 Z" fill={color} />

          {/* Baby Footprints (Left Side) */}
          {/* Footprint 1: Sole & 5 Toes */}
          <Path d="M 24 110 C 18 120 16 132 20 140 C 25 148 32 144 32 134 C 32 124 28 112 24 110 Z" fill={color} />
          <Circle cx="23" cy="103" r="2.2" fill={color} />
          <Circle cx="28" cy="104" r="2" fill={color} />
          <Circle cx="32" cy="107" r="1.8" fill={color} />
          <Circle cx="35" cy="111" r="1.5" fill={color} />
          <Circle cx="37" cy="116" r="1.2" fill={color} />

          {/* Footprint 2 (Right Offset) */}
          <Path d="M 46 128 C 40 138 38 150 42 158 C 47 166 54 162 54 152 C 54 142 50 130 46 128 Z" fill={color} />
          <Circle cx="45" cy="121" r="2.2" fill={color} />
          <Circle cx="50" cy="122" r="2" fill={color} />
          <Circle cx="54" cy="125" r="1.8" fill={color} />
          <Circle cx="57" cy="129" r="1.5" fill={color} />
          <Circle cx="59" cy="134" r="1.2" fill={color} />

          {/* Pacifier Silhouette (Middle Right) */}
          <G transform="translate(270, 150)">
            <Circle cx="16" cy="16" r="14" />
            <Circle cx="16" cy="16" r="7" />
            <Path d="M 16 2 L 16 -4 M 10 -4 C 10 -8 22 -8 22 -4 Z" />
            <Path d="M 16 30 A 8 8 0 0 1 16 46 A 8 8 0 0 1 16 30 Z" />
          </G>

          {/* Soft Cloud (Bottom Left) */}
          <Path d="M 15 285 C 10 285 5 280 5 275 C 5 270 10 266 16 266 C 18 261 24 257 30 258 C 36 254 44 256 48 261 C 53 260 58 264 58 269 C 62 270 65 275 63 280 C 65 285 60 289 54 289 L 15 289 Z" />

          {/* Baby Rattle (Bottom Right) */}
          <G transform="translate(275, 270)">
            <Circle cx="18" cy="18" r="14" />
            <Path d="M 18 32 L 18 62 M 12 62 L 24 62" />
            <Circle cx="18" cy="18" r="8" strokeDasharray="3 3" />
          </G>

          {/* Teddy Bear Head Silhouette (Middle Center) */}
          <G transform="translate(150, 185)">
            <Circle cx="20" cy="20" r="18" />
            <Circle cx="6" cy="6" r="6" />
            <Circle cx="34" cy="6" r="6" />
            <Circle cx="20" cy="24" r="6" />
            <Circle cx="16" cy="16" r="1.5" fill={color} />
            <Circle cx="24" cy="16" r="1.5" fill={color} />
          </G>
        </G>
      </Svg>
    </View>
  );
}

export const SpandaVidyaAiCard = React.memo(({ item }: SpandaVidyaAiCardProps) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.colors.premiumCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cardGradient, { borderColor: theme.colors.premiumCardBorder, borderRadius: theme.radii.xl }]}
      >
        {/* Layered Abstract Background Blobs / Orbs */}
        <View
          style={[
            styles.bgOrbPrimary,
            { backgroundColor: theme.colors.premiumCardOrbPrimary, borderRadius: theme.radii.full },
          ]}
          pointerEvents="none"
        />
        <View
          style={[
            styles.bgOrbSecondary,
            { backgroundColor: theme.colors.premiumCardOrbSecondary, borderRadius: theme.radii.full },
          ]}
          pointerEvents="none"
        />

        {/* Low-Opacity Decorative Baby Vector Illustrations */}
        <BabyBackgroundIllustrations color={theme.colors.premiumCardIllustration} />

        {/* Content Container */}
        <View style={styles.cardContent}>
          {/* Header Row: Title & Subtitle + Coming Soon Badge */}
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <ThemeText variant="heading" style={styles.title}>
                {item.title}
              </ThemeText>
              {item.subtitle ? (
                <ThemeText
                  variant="caption"
                  style={[
                    styles.subtitle,
                    { color: isDark ? theme.colors.accent.primary : theme.colors.accent.secondary },
                  ]}
                >
                  {item.subtitle}
                </ThemeText>
              ) : null}
            </View>

            <ThemeBadge label={item.badgeLabel} variant={item.badgeVariant ?? 'info'} size="sm" />
          </View>

          {/* Short Description */}
          <ThemeText
            variant="body"
            style={[
              styles.shortDescription,
              { color: theme.colors.text.primary },
            ]}
          >
            {item.description}
          </ThemeText>

          {/* Long Description */}
          {item.longDescription ? (
            <ThemeText
              variant="caption"
              style={[
                styles.longDescription,
                { color: theme.colors.text.secondary },
              ]}
            >
              {item.longDescription}
            </ThemeText>
          ) : null}

          <ThemeDivider style={styles.divider} />

          {/* 6 Multimodal Features Grid */}
          {item.features && item.features.length > 0 ? (
            <View style={styles.featuresGrid}>
              {item.features.map((feature) => (
                <View
                  key={feature.label}
                  style={[
                    styles.featureChip,
                    {
                      backgroundColor: isDark ? 'rgba(109, 40, 217, 0.18)' : 'rgba(139, 92, 246, 0.08)',
                      borderColor: theme.colors.premiumCardBorder,
                      borderRadius: theme.radii.md,
                    },
                  ]}
                >
                  <Ionicons name={feature.icon} size={15} color={theme.colors.accent.primary} />
                  <ThemeText variant="caption" style={styles.featureText}>
                    {feature.label}
                  </ThemeText>
                </View>
              ))}
            </View>
          ) : null}

          {/* Primary CTA Button: Learn More */}
          <Button
            label="Learn More"
            variant="primary"
            icon={<Ionicons name="open-outline" size={18} color={theme.colors.background.base} style={styles.buttonIcon} />}
            onPress={openInfantMindWebsite}
            accessibilityRole="button"
            accessibilityLabel="Learn More about SpandaVidya AI. Opens external website https://www.infantmind.ai/"
            accessibilityHint="Navigates to external website in default web browser"
            style={styles.learnMoreButton}
          />
        </View>
      </LinearGradient>
    </View>
  );
});

SpandaVidyaAiCard.displayName = 'SpandaVidyaAiCard';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
  },
  cardGradient: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
  },
  bgOrbPrimary: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 200,
    height: 200,
  },
  bgOrbSecondary: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 220,
    height: 220,
  },
  cardContent: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  shortDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
  longDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 10,
    marginBottom: 18,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    width: '48%',
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  learnMoreButton: {
    marginTop: 4,
  },
});
