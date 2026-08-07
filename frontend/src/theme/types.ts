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
    warning: string;
    danger: string;
  };
  border: {
    subtle: string;
    soft: string;
  };
  chatUserBubble: string;
  chatUserBubbleText: string;
  chatAssistantBubble: string;
  chatAssistantBubbleText: string;
  chatComposer: string;
  successSurface: string;
  warningSurface: string;
  errorSurface: string;
  errorBorder: string;
  accentSurface: string;
  uploadSuccess: string;
  reportReady: string;
  reportSynced: string;
  inputPlaceholder: string;
  /** Subtle background for text inputs and unselected interactive surfaces. */
  inputBackground: string;
  /** Text/icon color on top of accent.primary filled buttons. */
  accentButtonText: string;
  blurOverlay: 'light' | 'dark';
  floatingOrbPrimary: string;
  floatingOrbSecondary: string;
  /** Per-mode multiplier for animated orb opacity (applied to Reanimated shared value). */
  floatingOrbOpacityScale: {
    primary: number;
    secondary: number;
  };
  bottomSheetBackground: string;
  markdownCodeBlock: string;
  markdownInlineCode: string;
  shadowColor: string;
  /** Premium card background gradient colors (top, middle, bottom). */
  premiumCardGradient: readonly [string, string, string];
  /** Premium card subtle border color. */
  premiumCardBorder: string;
  /** Premium card decorative background orb primary color. */
  premiumCardOrbPrimary: string;
  /** Premium card decorative background orb secondary color. */
  premiumCardOrbSecondary: string;
  /** Premium card low-opacity background decorative illustrations stroke/fill color. */
  premiumCardIllustration: string;
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
    xxl: number;
  };
}

export interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  theme: AppTheme;
  navigationTheme: Theme;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}
