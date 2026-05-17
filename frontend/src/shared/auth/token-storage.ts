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
  } | null;
};

const ACCESS_TOKEN_KEY = 'doc_ai.access_token';
const REFRESH_TOKEN_KEY = 'doc_ai.refresh_token';
const USER_KEY = 'doc_ai.user';

export async function persistSession(session: StoredSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user ?? null)),
  ]);
}

export async function readSession(): Promise<StoredSession | null> {
  try {
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
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
