import { useEffect, useState, useContext } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { ThemeContext } from '@/theme/ThemeContext';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const systemScheme = useRNColorScheme();
  const context = useContext(ThemeContext);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = context ? (context.isDark ? 'dark' : 'light') : systemScheme;

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
