import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';

import { DEFAULT_THEME } from './constants';
import { navigationDarkTheme, navigationLightTheme } from './navigation-theme';
import { getPersistedThemeMode, persistThemeMode } from './storage';
import { ThemeContext } from './ThemeContext';
import { darkTheme, lightTheme } from './themes';
import type { ThemeContextType, ThemeMode } from './types';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(DEFAULT_THEME);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load persisted theme preference once on app launch
  useEffect(() => {
    let isMounted = true;
    async function initTheme() {
      try {
        const stored = await getPersistedThemeMode();
        if (isMounted && stored) {
          setThemeModeState(stored);
        }
      } catch (err) {
        console.warn('[ThemeProvider] Init failed:', err);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    }
    void initTheme();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute active theme mode (light or dark)
  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemScheme]);

  const theme = useMemo(() => {
    return isDark ? darkTheme : lightTheme;
  }, [isDark]);

  const navigationTheme = useMemo(() => {
    return isDark ? navigationDarkTheme : navigationLightTheme;
  }, [isDark]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await persistThemeMode(mode);
  }, []);

  const contextValue = useMemo<ThemeContextType>(
    () => ({
      themeMode,
      isDark,
      theme,
      navigationTheme,
      setThemeMode,
    }),
    [themeMode, isDark, theme, navigationTheme, setThemeMode]
  );

  // Prevent flicker by not rendering children until theme is hydrated
  if (!isHydrated) {
    return null;
  }

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}
