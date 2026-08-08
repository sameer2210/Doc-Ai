import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

export type UploadIllustrationProps = {
  width?: number | string;
  height?: number;
};

export const UploadIllustration = React.memo(({
  width = '100%',
  height = 130,
}: UploadIllustrationProps) => {
  const { theme, isDark } = useTheme();
  const { colors } = theme;

  // Subtle stroke derived strictly from theme tokens with 6-8% opacity styling
  const strokeColor = isDark ? colors.accent.primary : colors.text.secondary;
  const strokeOpacity = isDark ? 0.08 : 0.06;

  return (
    <View style={styles.container} pointerEvents="none" accessible={false}>
      <Svg width={width} height={height} viewBox="0 0 240 130" fill="none">
        <G stroke={strokeColor} strokeOpacity={strokeOpacity} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Cloud Upload Arc */}
          <Path d="M 80 80 C 65 80, 55 68, 60 54 C 65 40, 80 35, 92 40 C 98 26, 120 22, 134 32 C 145 25, 165 28, 170 42 C 182 44, 188 56, 182 70 C 178 80, 168 80, 160 80" />

          {/* Camera Frame in Center */}
          <Rect x="90" y="55" width="60" height="42" rx="8" />
          <Path d="M 108 55 L 114 48 L 126 48 L 132 55" />

          {/* Central Eye Aperture */}
          <Circle cx="120" cy="76" r="12" />
          <Circle cx="120" cy="76" r="4" fill={strokeColor} fillOpacity={strokeOpacity} />

          {/* Upward Upload Arrow */}
          <Path d="M 120 40 L 120 22 M 113 29 L 120 22 L 127 29" />

          {/* Corner Crosshair Reticles */}
          <Path d="M 40 30 L 48 30 M 40 30 L 40 38" />
          <Path d="M 200 30 L 192 30 M 200 30 L 200 38" />
          <Path d="M 40 100 L 48 100 M 40 100 L 40 92" />
          <Path d="M 200 100 L 192 100 M 200 100 L 200 92" />
        </G>
      </Svg>
    </View>
  );
});

UploadIllustration.displayName = 'UploadIllustration';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
