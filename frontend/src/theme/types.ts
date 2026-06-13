import type { Theme } from '@react-navigation/native';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ColorTheme {
  background: {
    base: string;
    elevated: string;
    surface: string;
    surfaceStrong: string;
  };
  accent: {
    primary: string;
    secondary: string;
    mutedGold: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    success: string;
    danger: string;
  };
  border: {
    subtle: string;
    soft: string;
  };
  chatUserBubble: string;
  chatAssistantBubble: string;
  chatComposer: string;
  successSurface: string;
  warningSurface: string;
  errorSurface: string;
  uploadSuccess: string;
  reportReady: string;
  reportSynced: string;
  inputPlaceholder: string;
  blurOverlay: 'light' | 'dark';
  floatingOrbPrimary: string;
  floatingOrbSecondary: string;
  bottomSheetBackground: string;
  markdownCodeBlock: string;
  markdownInlineCode: string;
}

export interface AppTheme {
  colors: ColorTheme;
  radii: {
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  theme: AppTheme;
  navigationTheme: Theme;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}
