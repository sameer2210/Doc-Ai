import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemeText } from '@/components/ui/theme/ThemeText';
import { useTheme } from '@/theme';

import { AboutSectionCard } from './about-section-card';
import { LegalDocumentCard } from './legal-document-card';
import { PRIVACY_SECURITY_CONTENT } from '../constants/privacy-security-content';

export function PrivacyPolicyContent() {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={styles.container}>
      <View style={styles.heroSection}>
        <ThemeText variant="title" style={styles.heroTitle}>
          {PRIVACY_SECURITY_CONTENT.title}
        </ThemeText>
        <ThemeText
          variant="caption"
          style={[styles.heroSubtitle, { color: colors.text.secondary }]}
        >
          {PRIVACY_SECURITY_CONTENT.subtitle}
        </ThemeText>
      </View>

      <AboutSectionCard
        title={PRIVACY_SECURITY_CONTENT.sections.collection.title}
        items={PRIVACY_SECURITY_CONTENT.sections.collection.items}
        variant="solid"
      />
      <AboutSectionCard
        title={PRIVACY_SECURITY_CONTENT.sections.usage.title}
        items={PRIVACY_SECURITY_CONTENT.sections.usage.items}
        variant="solid"
      />
      <AboutSectionCard
        title={PRIVACY_SECURITY_CONTENT.sections.storage.title}
        items={PRIVACY_SECURITY_CONTENT.sections.storage.items}
        variant="solid"
      />
      <AboutSectionCard
        title={PRIVACY_SECURITY_CONTENT.sections.security.title}
        items={PRIVACY_SECURITY_CONTENT.sections.security.items}
        variant="solid"
      />
      <AboutSectionCard
        title={PRIVACY_SECURITY_CONTENT.sections.disclaimer.title}
        items={PRIVACY_SECURITY_CONTENT.sections.disclaimer.items}
        variant="solid"
      />
      <AboutSectionCard
        title={PRIVACY_SECURITY_CONTENT.sections.rights.title}
        items={PRIVACY_SECURITY_CONTENT.sections.rights.items}
        variant="solid"
      />
      <AboutSectionCard
        title={PRIVACY_SECURITY_CONTENT.sections.contact.title}
        items={PRIVACY_SECURITY_CONTENT.sections.contact.items}
        variant="solid"
      />

      <LegalDocumentCard
        title="Complete Privacy Policy"
        description="This page provides a summary of our privacy practices. For the complete and legally binding Privacy Policy, please review the official document available on our website."
        buttonLabel="Read Full Privacy Policy"
        url="https://www.spandavidyaai.com/privacy"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
