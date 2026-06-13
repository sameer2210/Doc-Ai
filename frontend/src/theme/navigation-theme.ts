import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

import { darkColors, lightColors } from './colors';

export const navigationDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: darkColors.accent.primary,
    background: darkColors.background.base,
    card: darkColors.background.elevated,
    text: darkColors.text.primary,
    border: darkColors.border.subtle,
    notification: darkColors.text.danger,
  },
};

export const navigationLightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: lightColors.accent.primary,
    background: lightColors.background.base,
    card: lightColors.background.elevated,
    text: lightColors.text.primary,
    border: lightColors.border.subtle,
    notification: lightColors.text.danger,
  },
};
