import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Stored in OS keychain (iOS) / Android Keystore — not accessible to JS on other apps
type StoredSession = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    givenName?: string;
    familyName?: string;
    locale?: string;
    emailVerified?: boolean;
    provider?: string;
    providerId?: string;
  } | null;
};

const ACCESS_TOKEN_KEY = 'doc_ai.access_token';
const REFRESH_TOKEN_KEY = 'doc_ai.refresh_token';
const USER_KEY = 'doc_ai.user';

export async function persistSession(session: StoredSession): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(session.user ?? null));
    } catch (e) {
      console.warn('[Storage] Failed to save session to localStorage:', e);
    }
    return;
  }

  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user ?? null)),
  ]);
}

export async function readSession(): Promise<StoredSession | null> {
  try {
    if (Platform.OS === 'web') {
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      const userRaw = localStorage.getItem(USER_KEY);
      
      if (!accessToken || !refreshToken) return null;
      const user = userRaw ? (JSON.parse(userRaw) as StoredSession['user']) : null;
      return { accessToken, refreshToken, user };
    }

    const [accessToken, refreshToken, userRaw] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);

    if (!accessToken || !refreshToken) return null;

    const user = userRaw ? (JSON.parse(userRaw) as StoredSession['user']) : null;
    return { accessToken, refreshToken, user };
  } catch {
    return null;
  }
}

export async function clearPersistedSession(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.warn('[Storage] Failed to clear session from localStorage:', e);
    }
    return;
  }

  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
      ]);
    }
  } catch (e) {
    console.error('[Storage] SecureStore delete failed:', e);
  }
}
