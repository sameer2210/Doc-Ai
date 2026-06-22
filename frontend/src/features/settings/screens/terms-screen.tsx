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

import { AboutSectionCard } from '../components/about-section-card';
import { LegalDocumentCard } from '../components/legal-document-card';
import { TERMS_CONTENT } from '../constants/terms-content';

export function TermsScreen() {
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
          <ThemeText style={styles.headerTitle}>Terms & Conditions</ThemeText>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500)}>
            {/* Screen Title & Subtitle */}
            <View style={styles.heroSection}>
              <ThemeText variant="title" style={styles.heroTitle}>
                {TERMS_CONTENT.title}
              </ThemeText>
              <ThemeText
                variant="caption"
                style={[styles.heroSubtitle, { color: theme.colors.text.secondary }]}
              >
                {TERMS_CONTENT.subtitle}
              </ThemeText>
            </View>

            {/* Acceptable Use Section */}
            <AboutSectionCard
              title={TERMS_CONTENT.sections.usage.title}
              items={TERMS_CONTENT.sections.usage.items}
              variant="solid"
            />

            {/* Medical Disclaimer Section */}
            <AboutSectionCard
              title={TERMS_CONTENT.sections.health.title}
              items={TERMS_CONTENT.sections.health.items}
              variant="solid"
            />

            {/* Accounts Section */}
            <AboutSectionCard
              title={TERMS_CONTENT.sections.account.title}
              items={TERMS_CONTENT.sections.account.items}
              variant="solid"
            />

            {/* Limitation Section */}
            <AboutSectionCard
              title={TERMS_CONTENT.sections.limits.title}
              items={TERMS_CONTENT.sections.limits.items}
              variant="solid"
            />

            {/* Contact Section */}
            <AboutSectionCard
              title={TERMS_CONTENT.sections.contact.title}
              items={TERMS_CONTENT.sections.contact.items}
              variant="solid"
            />

            <LegalDocumentCard
              title="Complete Terms & Conditions"
              description="This page provides a summary of the key terms governing the use of SpandaVidya AI. For the complete and legally binding Terms & Conditions, please review the official document available on our website."
              buttonLabel="Read Full Terms & Conditions"
              url="https://www.spandavidyaai.com/terms"
            />
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
    paddingBottom: 100,
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
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
});
