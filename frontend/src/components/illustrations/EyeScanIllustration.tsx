import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/theme';

export type EyeScanIllustrationProps = {
  width?: number;
  height?: number;
};

export const EyeScanIllustration = React.memo(({
  width = 220,
  height = 190,
}: EyeScanIllustrationProps) => {
  const { theme, isDark } = useTheme();
  const { colors } = theme;

  // Theme-aware stroke and fill colors derived strictly from design system tokens
  const primaryStroke = colors.accent.primary;
  const secondaryStroke = colors.text.secondary;
  const tertiaryStroke = colors.text.tertiary;
  const borderStroke = colors.border.subtle;
  const beamColor = isDark ? '#60A5FA' : '#2563EB';
  const glowColor = isDark ? colors.accent.primary : '#3B82F6';

  return (
    <View style={styles.container} pointerEvents="none" accessible={false}>
      <Svg width={width} height={height} viewBox="0 0 220 190" fill="none">
        <Defs>
          {/* Layer 1: Ambient Background Radial Glow */}
          <RadialGradient id="scanBgGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor={glowColor} stopOpacity={isDark ? '0.12' : '0.07'} />
            <Stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </RadialGradient>

          {/* Layer 2: Scanning Beam Gradient */}
          <LinearGradient id="scanBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={beamColor} stopOpacity="0.05" />
            <Stop offset="50%" stopColor={beamColor} stopOpacity="0.85" />
            <Stop offset="100%" stopColor={beamColor} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Ambient Glow */}
        <Circle cx="110" cy="95" r="85" fill="url(#scanBgGlow)" />

        {/* Outer Focus Frame Brackets */}
        <G stroke={borderStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Top-Left Bracket */}
          <Path d="M 36 50 L 36 36 L 50 36" />
          {/* Top-Right Bracket */}
          <Path d="M 170 36 L 184 36 L 184 50" />
          {/* Bottom-Left Bracket */}
          <Path d="M 36 140 L 36 154 L 50 154" />
          {/* Bottom-Right Bracket */}
          <Path d="M 170 154 L 184 154 L 184 140" />
        </G>

        {/* Camera Aperture / Concentric Frame Rings */}
        <Circle cx="110" cy="95" r="70" stroke={borderStroke} strokeWidth="1" strokeDasharray="3 3" opacity={0.6} />
        <Circle cx="110" cy="95" r="54" stroke={tertiaryStroke} strokeWidth="1" opacity={0.4} />

        {/* Floating Particles */}
        <G fill={primaryStroke} opacity={0.4}>
          <Circle cx="50" cy="65" r="1.5" />
          <Circle cx="170" cy="65" r="1.5" />
          <Circle cx="46" cy="125" r="1.5" />
          <Circle cx="174" cy="125" r="1.5" />
          <Circle cx="110" cy="28" r="1.5" />
          <Circle cx="110" cy="162" r="1.5" />
        </G>

        {/* Minimal Eye Contour Outline */}
        <Path
          d="M 60 95 C 78 70, 142 70, 160 95 C 142 120, 78 120, 60 95 Z"
          stroke={secondaryStroke}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Iris & Pupil */}
        <Circle cx="110" cy="95" r="20" stroke={primaryStroke} strokeWidth="1.5" fill="none" />
        <Circle cx="110" cy="95" r="7" fill={primaryStroke} opacity={0.9} />

        {/* Active Laser Scanning Beam Line */}
        <Rect x="42" y="93" width="136" height="4" rx="2" fill="url(#scanBeamGrad)" />

        {/* Laser Focus Indicators */}
        <G stroke={beamColor} strokeWidth="1.5" opacity={0.9}>
          <Path d="M 110 70 L 110 76" />
          <Path d="M 110 114 L 110 120" />
          <Path d="M 85 95 L 91 95" />
          <Path d="M 129 95 L 135 95" />
        </G>
      </Svg>
    </View>
  );
});

EyeScanIllustration.displayName = 'EyeScanIllustration';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
