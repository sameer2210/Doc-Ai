import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';

interface ChatMenuItemProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
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
          backgroundColor: pressed ? theme.colors.border.subtle : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <View style={styles.contentContainer}>
        <Ionicons
          name={icon}
          size={24}
          color={iconColor}
          style={styles.icon}
        />
        <ThemeText
          style={[
            styles.label,
            {
              color: textColor,
              fontWeight: isDestructive ? '600' : '500',
            },
          ]}
        >
          {label}
        </ThemeText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    height: 56,
    justifyContent: 'center',
    width: '100%',
  } as ViewStyle,
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  icon: {
    marginRight: 8,
    width: 22,
    textAlign: 'center',
  },
  label: {
    fontSize: 18,
  },
});
