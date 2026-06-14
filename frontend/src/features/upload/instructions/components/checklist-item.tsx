import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemeText } from '@/components/ui/theme';
import { useTheme } from '@/theme';

interface ChecklistItemProps {
  readonly label: string;
  readonly variant: 'success' | 'warning' | 'error';
}

export const ChecklistItem = React.memo(({ label, variant }: ChecklistItemProps) => {
  const { theme } = useTheme();

  const getIconConfig = () => {
    switch (variant) {
      case 'success':
        return {
          name: 'checkmark-circle-outline' as const,
          color: theme.colors.text.success,
        };
      case 'warning':
        return {
          name: 'alert-circle-outline' as const,
          color: theme.colors.text.warning,
        };
      case 'error':
        return {
          name: 'close-circle-outline' as const,
          color: theme.colors.text.danger,
        };
    }
  };

  const { name, color } = getIconConfig();

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Ionicons name={name} size={18} color={color} />
      </View>
      <ThemeText
        variant="body"
        style={[styles.label, { color: theme.colors.text.secondary }]}
        allowFontScaling={true}
      >
        {label}
      </ThemeText>
    </View>
  );
});

ChecklistItem.displayName = 'ChecklistItem';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});
