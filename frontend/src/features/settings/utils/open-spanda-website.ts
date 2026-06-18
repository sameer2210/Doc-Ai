import { Linking, Alert } from 'react-native';

/**
 * Safely opens the official Spanda AI website in the default browser.
 * Gracefully handles failures and prevents crashes.
 */
export async function openSpandaWebsite(): Promise<void> {
  const url = 'https://spandavidyaai.com';
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        'Error',
        'Unable to open the website. Please visit https://spandavidyaai.com in your browser.'
      );
    }
  } catch {
    Alert.alert(
      'Error',
      'An unexpected error occurred while attempting to open the website.'
    );
  }
}
