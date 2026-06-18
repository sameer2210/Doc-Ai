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
import { HELP_SUPPORT_CONTENT } from '../constants/help-support-content';
import { openSupportEmail } from '../utils/open-support-email';
import { openSpandaWebsite } from '../utils/open-spanda-website';

export function HelpSupportScreen() {
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
          <ThemeText style={styles.headerTitle}>Help & Support</ThemeText>
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
                {HELP_SUPPORT_CONTENT.title}
              </ThemeText>
              <ThemeText
                variant="caption"
                style={[styles.heroSubtitle, { color: theme.colors.text.secondary }]}
              >
                {HELP_SUPPORT_CONTENT.subtitle}
              </ThemeText>
            </View>

            {/* Contact Support Section */}
            <AboutSectionCard
              title={HELP_SUPPORT_CONTENT.sections.contact.title}
              items={HELP_SUPPORT_CONTENT.sections.contact.items}
            />

            {/* Technical Issues Section */}
            <AboutSectionCard
              title={HELP_SUPPORT_CONTENT.sections.technical.title}
              items={HELP_SUPPORT_CONTENT.sections.technical.items}
            />

            {/* Privacy Questions Section */}
            <AboutSectionCard
              title={HELP_SUPPORT_CONTENT.sections.privacy.title}
              items={HELP_SUPPORT_CONTENT.sections.privacy.items}
            />

            {/* Report a Bug Section */}
            <AboutSectionCard
              title={HELP_SUPPORT_CONTENT.sections.bugReport.title}
              items={HELP_SUPPORT_CONTENT.sections.bugReport.items}
            />

            {/* Feedback Section */}
            <AboutSectionCard
              title={HELP_SUPPORT_CONTENT.sections.feedback.title}
              items={HELP_SUPPORT_CONTENT.sections.feedback.items}
            />

            {/* Emergency Notice Section */}
            <AboutSectionCard
              title={HELP_SUPPORT_CONTENT.sections.emergency.title}
              items={HELP_SUPPORT_CONTENT.sections.emergency.items}
            />

            {/* Quick Actions CTA Section */}
            <GlassCard style={styles.ctaCard}>
              <ThemeText variant="heading" style={styles.ctaTitle}>
                {HELP_SUPPORT_CONTENT.quickActions.title}
              </ThemeText>
              <ThemeText
                variant="body"
                style={[styles.ctaDescription, { color: theme.colors.text.secondary }]}
              >
                {HELP_SUPPORT_CONTENT.quickActions.description}
              </ThemeText>
              <View style={styles.buttonContainer}>
                <Button
                  label={HELP_SUPPORT_CONTENT.quickActions.emailButtonLabel}
                  variant="primary"
                  onPress={() => void openSupportEmail()}
                  style={styles.actionButton}
                />
                <Button
                  label={HELP_SUPPORT_CONTENT.quickActions.websiteButtonLabel}
                  variant="secondary"
                  onPress={() => void openSpandaWebsite()}
                  style={styles.actionButton}
                />
              </View>
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
  buttonContainer: {
    gap: 12,
  },
  actionButton: {
    width: '100%',
  },
});
