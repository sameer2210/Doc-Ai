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
import { PRIVACY_SECURITY_CONTENT } from '../constants/privacy-security-content';

export function PrivacySecurityScreen() {
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
          <ThemeText style={styles.headerTitle}>Privacy & Security</ThemeText>
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
                {PRIVACY_SECURITY_CONTENT.title}
              </ThemeText>
              <ThemeText
                variant="caption"
                style={[styles.heroSubtitle, { color: theme.colors.text.secondary }]}
              >
                {PRIVACY_SECURITY_CONTENT.subtitle}
              </ThemeText>
            </View>

            {/* Data Collection Section */}
            <AboutSectionCard
              title={PRIVACY_SECURITY_CONTENT.sections.collection.title}
              items={PRIVACY_SECURITY_CONTENT.sections.collection.items}
            />

            {/* Data Usage Section */}
            <AboutSectionCard
              title={PRIVACY_SECURITY_CONTENT.sections.usage.title}
              items={PRIVACY_SECURITY_CONTENT.sections.usage.items}
            />

            {/* Data Storage Section */}
            <AboutSectionCard
              title={PRIVACY_SECURITY_CONTENT.sections.storage.title}
              items={PRIVACY_SECURITY_CONTENT.sections.storage.items}
            />

            {/* Security Measures Section */}
            <AboutSectionCard
              title={PRIVACY_SECURITY_CONTENT.sections.security.title}
              items={PRIVACY_SECURITY_CONTENT.sections.security.items}
            />

            {/* AI & Medical Disclaimer Section */}
            <AboutSectionCard
              title={PRIVACY_SECURITY_CONTENT.sections.disclaimer.title}
              items={PRIVACY_SECURITY_CONTENT.sections.disclaimer.items}
            />

            {/* User Rights Section */}
            <AboutSectionCard
              title={PRIVACY_SECURITY_CONTENT.sections.rights.title}
              items={PRIVACY_SECURITY_CONTENT.sections.rights.items}
            />

            {/* Contact Information Section */}
            <AboutSectionCard
              title={PRIVACY_SECURITY_CONTENT.sections.contact.title}
              items={PRIVACY_SECURITY_CONTENT.sections.contact.items}
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
});
