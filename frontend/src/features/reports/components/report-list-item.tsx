import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, StyleSheet } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { ThemeBadge, ThemeText } from '@/components/ui/theme';
import { useTheme } from '@/theme';

export interface ReportItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly time: string;
  readonly badge: 'Ready' | 'Synced' | 'Processing' | 'Failed';
  readonly icon: keyof typeof Ionicons.glyphMap;
}

interface ReportListItemProps {
  readonly item: ReportItem;
  readonly onPress: () => void;
}

export const ReportListItem = React.memo(({ item, onPress }: ReportListItemProps) => {
  const { theme, isDark } = useTheme();

  const getBadgeVariant = (badge: ReportItem['badge']) => {
    switch (badge) {
      case 'Ready':
        return 'success';
      case 'Synced':
        return 'info';
      case 'Processing':
        return 'warning';
      case 'Failed':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getIconBackground = () => {
    switch (item.badge) {
      case 'Ready':
        return theme.colors.successSurface;
      case 'Failed':
        return theme.colors.errorSurface;
      case 'Synced':
        return theme.colors.accentSurface;
      default:
        return theme.colors.border.subtle;
    }
  };

  const getIconColor = () => {
    switch (item.badge) {
      case 'Ready':
        return theme.colors.text.success;
      case 'Failed':
        return theme.colors.text.danger;
      case 'Synced':
        return theme.colors.accent.primary;
      default:
        return theme.colors.text.secondary;
    }
  };

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Report: ${item.title}. Status is ${item.badge}. Created ${item.time}.`}
      style={styles.pressable}
    >
      <GlassCard
        style={[
          styles.card,
          {
            backgroundColor: isDark ? theme.colors.background.surface : theme.colors.background.elevated,
            borderColor: theme.colors.border.subtle,
          },
        ]}
      >
        <View style={styles.leftSection}>
          <View style={[styles.iconWrapper, { backgroundColor: getIconBackground() }]}>
            <Ionicons name={item.icon} size={18} color={getIconColor()} />
          </View>
          <View style={styles.textContainer}>
            <ThemeText variant="heading" style={styles.title} allowFontScaling={true}>
              {item.title}
            </ThemeText>
            <ThemeText
              variant="caption"
              style={[styles.description, { color: theme.colors.text.secondary }]}
              allowFontScaling={true}
              numberOfLines={1}
            >
              {item.description}
            </ThemeText>
            <ThemeText
              variant="caption"
              style={[styles.time, { color: theme.colors.text.tertiary }]}
              allowFontScaling={true}
            >
              {item.time}
            </ThemeText>
          </View>
        </View>

        <View style={styles.rightSection}>
          <ThemeBadge label={item.badge} variant={getBadgeVariant(item.badge)} size="sm" />
          <Ionicons name="chevron-forward" size={16} color={theme.colors.text.tertiary} />
        </View>
      </GlassCard>
    </PressableScale>
  );
});

ReportListItem.displayName = 'ReportListItem';

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 100,
    borderWidth: 1,
    borderRadius: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  time: {
    fontSize: 11,
    lineHeight: 14,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
