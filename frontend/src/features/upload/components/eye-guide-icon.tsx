import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { appTheme } from '@/theme';

type EyeGuideIconProps = {
  size?: number;
};

export function EyeGuideIcon({ size = 88 }: EyeGuideIconProps) {
  const iconSize = Math.max(24, Math.round(size * 0.36));

  return (
    <View
      pointerEvents="none"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: appTheme.colors.border.soft,
        backgroundColor: 'rgba(7, 12, 20, 0.42)',
      }}
    >
      <Ionicons name="eye-outline" size={iconSize} color={appTheme.colors.accent.secondary} />
      <View
        style={{
          position: 'absolute',
          width: size * 0.18,
          height: size * 0.18,
          borderRadius: size * 0.09,
          backgroundColor: appTheme.colors.accent.primary,
          opacity: 0.85,
        }}
      />
    </View>
  );
}
