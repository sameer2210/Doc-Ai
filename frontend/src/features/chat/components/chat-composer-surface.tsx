import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface ChatComposerSurfaceProps {
  children: React.ReactNode;
}

export function ChatComposerSurface({ children }: ChatComposerSurfaceProps) {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.chatComposer,
          borderColor: theme.colors.border.soft,
          shadowColor: theme.colors.shadowColor,
          shadowOpacity: isDark ? 0.3 : 0.04,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 2,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 1,
  } as ViewStyle,
});
