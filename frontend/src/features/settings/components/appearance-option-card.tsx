import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ThemeSurface } from '@/components/ui/theme/ThemeSurface';
import { PressableScale } from '@/components/ui/PressableScale';

interface AppearanceOptionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  isSelected: boolean;
  onPress: () => void;
}

export function AppearanceOptionCard({
  icon,
  title,
  description,
  isSelected,
  onPress,
}: AppearanceOptionCardProps) {
  const { theme } = useTheme();

  return (
    <PressableScale onPress={onPress} style={{ marginBottom: 12 }}>
      <ThemeSurface
        variant={isSelected ? 'elevated' : 'surface'}
        style={[
          styles.container,
          {
            borderColor: isSelected ? theme.colors.accent.primary : theme.colors.border.subtle,
            borderWidth: 1.5,
          },
        ]}
      >
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: isSelected
                ? theme.colors.accent.primary
                : theme.colors.border.subtle,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={isSelected ? theme.colors.chatUserBubbleText : theme.colors.accent.primary}
          />
        </View>

        <View style={styles.textContainer}>
          <ThemeText style={styles.title}>{title}</ThemeText>
          <ThemeText variant="caption" style={styles.description}>
            {description}
          </ThemeText>
        </View>

        {isSelected ? (
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent.primary} />
        ) : (
          <View style={[styles.radioEmpty, { borderColor: theme.colors.border.soft }]} />
        )}
      </ThemeSurface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
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
  radioEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
});
