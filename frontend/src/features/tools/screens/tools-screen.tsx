import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ThemeBadge, ThemeSurface, ThemeText } from '@/components/ui/theme';
import { useTheme } from '@/theme';

import { SpandaVidyaAiCard } from '../components/spandavidya-ai-card';
import { TOOLS_SECTIONS, type ToolItem, type ToolSection } from '../constants/tools';

interface ToolCardProps {
  readonly item: ToolItem;
  readonly isCompact: boolean;
}

const ToolCard = React.memo(({ item, isCompact }: ToolCardProps) => {
  const { theme } = useTheme();

  if (item.isFeaturedCard) {
    return <SpandaVidyaAiCard item={item} />;
  }

  const handlePress = () => {
    if (item.route) {
      router.push(item.route);
    }
  };

  return (
    <PressableScale
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      accessibilityHint={item.description}
      hitSlop={8}
      style={[styles.toolPressable, { width: isCompact ? '100%' : '48%' }]}
    >
      <GlassCard style={styles.toolCard}>
        <View style={styles.toolHeader}>
          <View
            style={[
              styles.iconShell,
              {
                backgroundColor: theme.colors.successSurface,
                borderColor: theme.colors.border.subtle,
              },
            ]}
          >
            <Ionicons name={item.icon} size={20} color={theme.colors.accent.primary} />
          </View>

          <ThemeBadge label={item.badgeLabel} variant={item.badgeVariant ?? 'neutral'} size="sm" />
        </View>

        <ThemeText variant="heading" style={styles.toolTitle}>
          {item.title}
        </ThemeText>

        <ThemeText variant="caption" style={[styles.toolDescription, { color: theme.colors.text.secondary }]}>
          {item.description}
        </ThemeText>
      </GlassCard>
    </PressableScale>
  );
});

ToolCard.displayName = 'ToolCard';

interface ToolsSectionProps {
  readonly section: ToolSection;
  readonly isCompact: boolean;
}

const ToolsSectionBlock = React.memo(({ section, isCompact }: ToolsSectionProps) => {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemeText variant="heading" style={styles.sectionTitle}>
          {section.title}
        </ThemeText>
        {section.subtitle ? (
          <ThemeText variant="caption" style={{ color: theme.colors.text.secondary }}>
            {section.subtitle}
          </ThemeText>
        ) : null}
      </View>

      <View style={styles.grid}>
        {section.items.map((item) => (
          <ToolCard key={item.id} item={item} isCompact={isCompact} />
        ))}
      </View>
    </View>
  );
});

ToolsSectionBlock.displayName = 'ToolsSectionBlock';

export function ToolsScreen() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 720;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.base }]} edges={['top', 'bottom']}>
      <ScreenBackground />

      <View style={styles.root}>
        <ThemeSurface
          variant="background"
          style={[
            styles.headerSurface,
            {
              borderBottomColor: theme.colors.border.subtle,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <ThemeBadge label="Tools" variant="info" size="sm" />
              <ThemeText variant="title" style={styles.title}>
                SpandaVidya AI Tool Workspace
              </ThemeText>
              <ThemeText variant="body" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                Explore clinical utilities, consultation shortcuts, and app preferences from one place.
              </ThemeText>
            </View>
          </View>
        </ThemeSurface>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {TOOLS_SECTIONS.map((section) => (
            <ToolsSectionBlock key={section.id} section={section} isCompact={isCompact} />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  headerSurface: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 10,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 520,
  },
  headerOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    opacity: 0.8,
    marginTop: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
  },
  summaryCard: {
    marginBottom: 8,
  },
  summaryTitle: {
    marginTop: 8,
    marginBottom: 8,
  },
  summaryDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 14,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  toolPressable: {
    minHeight: 44,
  },
  toolCard: {
    minHeight: 168,
    flex: 1,
    justifyContent: 'space-between',
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  iconShell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  toolTitle: {
    marginBottom: 8,
  },
  toolDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
});
