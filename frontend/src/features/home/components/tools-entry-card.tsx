import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { PressableScale } from '@/components/ui/PressableScale';

interface ToolsEntryCardProps {
  readonly onPress: () => void;
}

export const ToolsEntryCard = React.memo(({ onPress }: ToolsEntryCardProps) => {
  const { theme, isDark } = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Explore More Tools. Reports, History, Wellness Tools"
      style={styles.pressable}
    >
      <View
        style={[
          styles.container,
          {
            borderColor: theme.colors.border.subtle,
            backgroundColor: theme.colors.background.surface,
          }
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDark ? 'rgba(110, 168, 255, 0.12)' : 'rgba(36, 74, 133, 0.08)',
            }
          ]}
        >
          <Ionicons name="grid-outline" size={20} color={theme.colors.accent.primary} />
        </View>

        <View style={styles.textContainer}>
          <ThemeText variant="heading" style={styles.title}>
            Explore More Tools
          </ThemeText>
          <ThemeText
            variant="caption"
            style={[
              styles.description,
              { color: isDark ? theme.colors.text.secondary : theme.colors.text.tertiary }
            ]}
          >
            Reports, History, Wellness Tools
          </ThemeText>
        </View>

        <Ionicons name="chevron-forward" size={18} color={theme.colors.text.tertiary} />
      </View>
    </PressableScale>
  );
});

ToolsEntryCard.displayName = 'ToolsEntryCard';

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    marginBottom: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    minHeight: 80,
  },
  iconContainer: {
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 12,
    marginTop: 2,
  },
});
