import React from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { useTheme } from '@/theme';

export interface LegalDocumentCardProps {
  title: string;
  description: string;
  buttonLabel: string;
  url: string;
}

export function LegalDocumentCard({
  title,
  description,
  buttonLabel,
  url,
}: LegalDocumentCardProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const handleOpenLink = async (): Promise<void> => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Unable to Open Link',
          `The official document could not be opened. Please visit ${url} in your web browser.`,
        );
      }
    } catch {
      Alert.alert(
        'Unable to Open Link',
        'An unexpected error occurred while attempting to open this link. Please try again later.',
      );
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.subtle,
        },
      ]}
    >
      <ThemeText
        variant="heading"
        style={[styles.title, { color: colors.text.primary }]}
      >
        {title}
      </ThemeText>

      <ThemeText
        variant="body"
        style={[styles.description, { color: colors.text.secondary }]}
      >
        {description}
      </ThemeText>

      <Button
        label={buttonLabel}
        onPress={handleOpenLink}
        variant="primary"
        style={styles.button}
      />

      <ThemeText
        variant="caption"
        style={[styles.urlText, { color: colors.text.tertiary }]}
      >
        {url}
      </ThemeText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    marginBottom: 16,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  button: {
    width: '100%',
  },
  urlText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 14,
    textDecorationLine: 'underline',
  },
});
