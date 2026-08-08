import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/theme';

export type EyeAnalysisFailedIllustrationProps = {
  width?: number;
  height?: number;
};

export const EyeAnalysisFailedIllustration = React.memo(({
  width = 200,
  height = 180,
}: EyeAnalysisFailedIllustrationProps) => {
  const { theme, isDark } = useTheme();
  const { colors } = theme;

  // Theme-aware stroke and fill colors derived strictly from design system tokens
  const primaryStroke = colors.accent.primary;
  const secondaryStroke = colors.text.secondary;
  const tertiaryStroke = colors.text.tertiary;
  const borderStroke = colors.border.subtle;
  const glowColor = isDark ? colors.accent.primary : colors.accent.secondary;
  const warningBadgeBg = isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(220, 38, 38, 0.10)';
  const warningBadgeStroke = isDark ? '#FCA5A5' : '#DC2626';

  return (
    <View style={styles.container} pointerEvents="none" accessible={false}>
      <Svg width={width} height={height} viewBox="0 0 200 180" fill="none">
        <Defs>
          <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor={glowColor} stopOpacity={isDark ? '0.08' : '0.05'} />
            <Stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Layer 1: Soft Ambient Radial Glow */}
        <Circle cx="100" cy="90" r="75" fill="url(#glowGrad)" />

        {/* Layer 2: Medical Scan Frame Corner Brackets */}
        <G stroke={borderStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Top-Left Corner Bracket */}
          <Path d="M 32 50 L 32 38 L 44 38" />
          {/* Top-Right Corner Bracket */}
          <Path d="M 156 38 L 168 38 L 168 50" />
          {/* Bottom-Left Corner Bracket */}
          <Path d="M 32 130 L 32 142 L 44 142" />
          {/* Bottom-Right Corner Bracket */}
          <Path d="M 156 142 L 168 142 L 168 130" />
        </G>

        {/* Layer 7: Floating Background Particles */}
        <G fill={tertiaryStroke} opacity={0.3}>
          <Circle cx="48" cy="62" r="1.5" />
          <Circle cx="152" cy="62" r="1.5" />
          <Circle cx="44" cy="118" r="1.5" />
          <Circle cx="156" cy="118" r="1.5" />
          <Circle cx="100" cy="30" r="1.5" />
          <Circle cx="100" cy="150" r="1.5" />
        </G>

        {/* Layer 3: Minimal Eye Contour Outline */}
        <Path
          d="M 52 90 C 70 66, 130 66, 148 90 C 130 114, 70 114, 52 90 Z"
          stroke={secondaryStroke}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Layer 4: Simple Iris & Pupil */}
        <Circle
          cx="100"
          cy="90"
          r="18"
          stroke={primaryStroke}
          strokeWidth="1.5"
          fill="none"
        />
        <Circle cx="100" cy="90" r="6" fill={primaryStroke} opacity={0.85} />

        {/* Layer 5: Broken Focus Ring (Dashed circle indicating AI lost focus) */}
        <Circle
          cx="100"
          cy="90"
          r="30"
          stroke={tertiaryStroke}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          fill="none"
        />

        {/* Layer 6: Subtle Warning Badge */}
        <G transform="translate(132, 60)">
          <Circle cx="0" cy="0" r="11" fill={warningBadgeBg} stroke={warningBadgeStroke} strokeWidth="1.25" />
          <Path d="M 0 -5 L 0 0" stroke={warningBadgeStroke} strokeWidth="1.75" strokeLinecap="round" />
          <Circle cx="0" cy="4" r="1" fill={warningBadgeStroke} />
        </G>
      </Svg>
    </View>
  );
});

EyeAnalysisFailedIllustration.displayName = 'EyeAnalysisFailedIllustration';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
