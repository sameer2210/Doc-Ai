import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { THEME_STORAGE_KEY } from './constants';
import type { ThemeMode } from './types';

export async function getPersistedThemeMode(): Promise<ThemeMode | null> {
  try {
    if (Platform.OS === 'web') {
      const mode = localStorage.getItem(THEME_STORAGE_KEY);
      return (mode as ThemeMode) || null;
    }

    // Check SecureStore availability on native platforms
    const isAvailable = await SecureStore.isAvailableAsync();
    if (!isAvailable) return null;

    const mode = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
    return (mode as ThemeMode) || null;
  } catch {
    return null;
  }
}

export async function persistThemeMode(mode: ThemeMode): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
      return;
    }

    const isAvailable = await SecureStore.isAvailableAsync();
    if (!isAvailable) return;

    await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
  } catch {
  }
}
