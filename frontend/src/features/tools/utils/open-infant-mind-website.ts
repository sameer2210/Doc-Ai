import { Alert, Linking } from 'react-native';

const INFANT_MIND_URL = 'https://www.infantmind.ai/';

/**
 * Safely opens the official SpandaVidya AI (Infant Mind) external website in the default browser.
 * Gracefully handles missing URL handlers and network errors.
 */
export async function openInfantMindWebsite(): Promise<void> {
  try {
    const canOpen = await Linking.canOpenURL(INFANT_MIND_URL);
    if (canOpen) {
      await Linking.openURL(INFANT_MIND_URL);
    } else {
      Alert.alert(
        'Unable to Open Link',
        `Could not open ${INFANT_MIND_URL}. Please open your browser and visit https://www.infantmind.ai/ manually.`
      );
    }
  } catch {
    Alert.alert(
      'Error',
      'An unexpected error occurred while trying to open https://www.infantmind.ai/'
    );
  }
}
