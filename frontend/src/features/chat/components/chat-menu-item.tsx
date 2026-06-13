import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';

interface ChatMenuItemProps {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  isDestructive?: boolean;
}

export function ChatMenuItem({
  label,
  icon,
  onPress,
  disabled = false,
  isDestructive = false,
}: ChatMenuItemProps) {
  const { theme } = useTheme();

  const textColor = isDestructive
    ? theme.colors.text.danger
    : theme.colors.text.primary;

  const iconColor = isDestructive
    ? theme.colors.text.danger
    : theme.colors.text.secondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.menuItem,
        {
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
          height: 52,
        },
      ]}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={iconColor}
        style={styles.icon}
      />
      <ThemeText
        style={{
          color: textColor,
          fontSize: 14,
          fontWeight: isDestructive ? '600' : '400',
        }}
      >
        {label}
      </ThemeText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  } as ViewStyle,
  icon: {
    marginRight: 12,
  },
});
