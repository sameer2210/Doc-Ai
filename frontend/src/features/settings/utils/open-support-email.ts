import { Linking, Alert } from 'react-native';

/**
 * Safely opens the device mail client pre-addressed to Spanda AI support.
 * Gracefully handles failures and prevents crashes.
 */
export async function openSupportEmail(): Promise<void> {
  const email = 'support@spandavidyaai.com';
  const subject = encodeURIComponent('Spanda AI App Support Request');
  const url = `mailto:${email}?subject=${subject}`;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        'Error',
        `Unable to open your email client. Please send an email directly to ${email}.`
      );
    }
  } catch {
    Alert.alert(
      'Error',
      'An unexpected error occurred while attempting to open your email application.'
    );
  }
}
