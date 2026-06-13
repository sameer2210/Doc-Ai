import { useContext } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { ThemeContext } from '@/theme/ThemeContext';

export function useColorScheme() {
  const systemScheme = useRNColorScheme();
  const context = useContext(ThemeContext);

  if (context) {
    return context.isDark ? 'dark' : 'light';
  }
  return systemScheme;
}
