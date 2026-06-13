import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { PressableScale } from '@/components/ui/PressableScale';

interface ProfileActionItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  onPress: () => void;
  isDestructive?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

export function ProfileActionItem({
  icon,
  title,
  description,
  onPress,
  isDestructive = false,
  disabled = false,
  loading = false,
}: ProfileActionItemProps) {
  const { theme } = useTheme();

  const iconColor = isDestructive
    ? theme.colors.text.danger
    : theme.colors.accent.primary;

  const textColor = isDestructive
    ? theme.colors.text.danger
    : theme.colors.text.primary;

  const borderColor = isDestructive
    ? theme.colors.errorBorder
    : theme.colors.border.subtle;

  const backgroundColor = isDestructive
    ? theme.colors.errorSurface
    : theme.colors.background.surface;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.container,
        {
          borderColor,
          backgroundColor,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      <View style={styles.textContainer}>
        <ThemeText style={[styles.title, { color: textColor }]}>{title}</ThemeText>
        {description && (
          <ThemeText variant="caption" style={styles.description}>
            {description}
          </ThemeText>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={isDestructive ? theme.colors.text.danger : theme.colors.text.tertiary}
        />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
});
