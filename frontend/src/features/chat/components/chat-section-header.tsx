import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';

interface ChatSectionHeaderProps {
  title: string;
  style?: StyleProp<ViewStyle>;
}

export function ChatSectionHeader({ title, style }: ChatSectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ThemeText
        style={{
          fontFamily: 'SpaceGrotesk_700Bold',
          color: theme.colors.accent.primary,
          fontWeight: '700',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
        }}
      >
        {title}
      </ThemeText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    marginBottom: 8,
  } as ViewStyle,
});
