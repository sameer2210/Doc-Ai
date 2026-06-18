import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useTheme } from '@/theme';
import { PressableScale } from '@/components/ui/PressableScale';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

import { AboutSectionCard } from '../components/about-section-card';
import { ABOUT_SPANDA_CONTENT } from '../constants/about-spanda-content';
import { openSpandaWebsite } from '../utils/open-spanda-website';

export function AboutSpandaScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background.base }]}
      edges={['top']}
    >
      <View style={styles.flex1}>
        <ScreenBackground />

        {/* Header with Back Trigger */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border.subtle }]}>
          <PressableScale onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text.primary} />
          </PressableScale>
          <ThemeText style={styles.headerTitle}>About Spanda AI</ThemeText>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500)}>
            {/* Screen Title & Subtitle */}
            <View style={styles.heroSection}>
              <ThemeText variant="title" style={styles.heroTitle}>
                {ABOUT_SPANDA_CONTENT.title}
              </ThemeText>
              <ThemeText
                variant="caption"
                style={[styles.heroSubtitle, { color: theme.colors.text.secondary }]}
              >
                {ABOUT_SPANDA_CONTENT.subtitle}
              </ThemeText>
            </View>

            {/* Mission Section */}
            <AboutSectionCard
              title={ABOUT_SPANDA_CONTENT.sections.mission.title}
              items={ABOUT_SPANDA_CONTENT.sections.mission.items}
            />

            {/* Vision Section */}
            <AboutSectionCard
              title={ABOUT_SPANDA_CONTENT.sections.vision.title}
              items={ABOUT_SPANDA_CONTENT.sections.vision.items}
            />

            {/* Privacy & Security Section */}
            <AboutSectionCard
              title={ABOUT_SPANDA_CONTENT.sections.privacy.title}
              items={ABOUT_SPANDA_CONTENT.sections.privacy.items}
            />

            {/* AI Disclaimer Section */}
            <AboutSectionCard
              title={ABOUT_SPANDA_CONTENT.sections.disclaimer.title}
              items={ABOUT_SPANDA_CONTENT.sections.disclaimer.items}
            />

            {/* User Consent Section */}
            <AboutSectionCard
              title={ABOUT_SPANDA_CONTENT.sections.consent.title}
              items={ABOUT_SPANDA_CONTENT.sections.consent.items}
            />

            {/* Technology Section */}
            <AboutSectionCard
              title={ABOUT_SPANDA_CONTENT.sections.technology.title}
              items={ABOUT_SPANDA_CONTENT.sections.technology.items}
            />

            {/* Website CTA Section */}
            <GlassCard style={styles.ctaCard}>
              <ThemeText variant="heading" style={styles.ctaTitle}>
                {ABOUT_SPANDA_CONTENT.website.title}
              </ThemeText>
              <ThemeText
                variant="body"
                style={[styles.ctaDescription, { color: theme.colors.text.secondary }]}
              >
                {ABOUT_SPANDA_CONTENT.website.description}
              </ThemeText>
              <Button
                label={ABOUT_SPANDA_CONTENT.website.buttonLabel}
                variant="primary"
                onPress={() => void openSpandaWebsite()}
                style={styles.ctaButton}
              />
            </GlassCard>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  headerRightPlaceholder: {
    width: 30,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  ctaCard: {
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'stretch',
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaButton: {
    marginTop: 4,
  },
});
