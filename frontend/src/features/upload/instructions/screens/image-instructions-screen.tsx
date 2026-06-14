import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlassCard } from '@/components/ui/GlassCard';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ThemeBadge, ThemeDivider, ThemeText } from '@/components/ui/theme';
import { useTheme } from '@/theme';

import { BAD_IMAGE_INSTRUCTIONS } from '../constants/instruction-data';
import { CropGuideCard } from '../components/crop-guide-card';
import { ExampleGrid } from '../components/example-grid';
import { InstructionCard } from '../components/instruction-card';
import { ChecklistItem } from '../components/checklist-item';

export function ImageInstructionsScreen() {
  const { theme, isDark } = useTheme();

  const headerOptions = {
    headerShown: true,
    headerTitle: 'Image Guidelines',
    headerBackTitleVisible: false,
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor: theme.colors.background.base,
    },
    headerTintColor: theme.colors.text.primary,
    headerTitleStyle: {
      fontWeight: '600' as const,
      fontSize: 18,
    },
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background.base }]}
      edges={['bottom']}
    >
      <ScreenBackground />
      <Stack.Screen
        options={headerOptions}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Why Image Quality Matters Card */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <GlassCard
            style={[
              styles.qualityCard,
              {
                backgroundColor: isDark ? theme.colors.background.surface : theme.colors.background.elevated,
                borderColor: theme.colors.border.subtle,
              },
            ]}
          >
            <View style={styles.badgeWrapper}>
              <ThemeBadge label="Why Image Quality Matters" variant="info" size="sm" />
            </View>
            <ThemeText
              variant="body"
              style={[styles.qualityText, { color: theme.colors.text.primary }]}
              allowFontScaling={true}
            >
              Accurate eye images help the AI model identify cataract patterns more reliably.
            </ThemeText>
            <ThemeText
              variant="caption"
              style={[styles.qualityTextSub, { color: theme.colors.text.secondary }]}
              allowFontScaling={true}
            >
              Poor image quality may reduce screening accuracy and lead to unreliable results.
            </ThemeText>
          </GlassCard>
        </Animated.View>

        {/* Things To Avoid Section */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <View style={styles.sectionHeaderRow}>
            <ThemeText variant="heading" style={styles.sectionTitle}>
              Things To Avoid
            </ThemeText>
          </View>
          <ThemeDivider spacing={8} />

          <View style={styles.avoidList}>
            {BAD_IMAGE_INSTRUCTIONS.map((item) => (
              <InstructionCard key={item.id} item={item} />
            ))}
          </View>
        </Animated.View>

        {/* Good Examples Section */}
        <Animated.View entering={FadeInDown.duration(500).delay(160)}>
          <View style={styles.sectionHeaderRow}>
            <ThemeText variant="heading" style={styles.sectionTitle}>
              Good Examples
            </ThemeText>
          </View>
          <ThemeDivider spacing={8} />

          <GlassCard
            style={[
              styles.rulesCard,
              {
                backgroundColor: isDark ? theme.colors.background.surface : theme.colors.background.elevated,
                borderColor: theme.colors.border.subtle,
              },
            ]}
          >
            <ChecklistItem label="Eye centered in frame" variant="success" />
            <ChecklistItem label="Iris fully visible" variant="success" />
            <ChecklistItem label="Bright natural lighting" variant="success" />
            <ChecklistItem label="Camera focused on eye" variant="success" />
            <ChecklistItem label="No reflections or glare" variant="success" />
            <ChecklistItem label="Single eye clearly visible" variant="success" />
          </GlassCard>

          <ExampleGrid type="good" />
        </Animated.View>

        {/* Crop Guide Section */}
        <Animated.View entering={FadeInDown.duration(500).delay(220)}>
          <View style={styles.sectionHeaderRow}>
            <ThemeText variant="heading" style={styles.sectionTitle}>
              Crop Guide
            </ThemeText>
          </View>
          <ThemeDivider spacing={8} />

          <CropGuideCard />
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  qualityCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 28,
  },
  badgeWrapper: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  qualityText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 8,
  },
  qualityTextSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  avoidList: {
    gap: 8,
    marginBottom: 24,
  },
  rulesCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  bottomSpacer: {
    height: 40,
  },
});
