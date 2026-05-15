import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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

const SESSION_KEY = 'doc_ai.session.v1';

function canUseLocalStorage(): boolean {
  return typeof globalThis !== 'undefined' && 'localStorage' in globalThis;
}

function shouldUseWebStorageFallback(): boolean {
  return Platform.OS === 'web' && canUseLocalStorage();
}

export async function persistSession(session: StoredSession): Promise<void> {
  const serialized = JSON.stringify(session);

  if (shouldUseWebStorageFallback()) {
    globalThis.localStorage.setItem(SESSION_KEY, serialized);
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, serialized);
}

export async function readSession(): Promise<StoredSession | null> {
  let raw: string | null = null;

  if (shouldUseWebStorageFallback()) {
    raw = globalThis.localStorage.getItem(SESSION_KEY);
  } else {
    try {
      raw = await SecureStore.getItemAsync(SESSION_KEY);
    } catch {
      return null;
    }
  }

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.accessToken || !parsed.refreshToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPersistedSession(): Promise<void> {
  if (shouldUseWebStorageFallback()) {
    globalThis.localStorage.removeItem(SESSION_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
}
