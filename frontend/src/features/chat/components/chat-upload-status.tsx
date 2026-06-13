import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';

interface ChatUploadStatusProps {
  message: string | null;
}

export function ChatUploadStatus({ message }: ChatUploadStatusProps) {
  const { theme } = useTheme();

  if (!message) return null;

  const isFailed = message.toLowerCase().includes('failed');

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: isFailed
            ? theme.colors.text.danger
            : theme.colors.border.soft,
          backgroundColor: isFailed
            ? theme.colors.errorSurface
            : theme.colors.border.subtle,
        },
      ]}
    >
      <ThemeText
        numberOfLines={1}
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: isFailed
            ? theme.colors.text.danger
            : theme.colors.accent.primary,
        }}
      >
        {message}
      </ThemeText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
