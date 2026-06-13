import { darkTheme } from './themes';

// Backward compatibility: export the production dark theme statically as appTheme
export const appTheme = darkTheme;

export type AppTheme = typeof appTheme;

export * from './types';
export * from './colors';
export * from './themes';
export * from './constants';
export * from './storage';
export * from './ThemeContext';
export * from './ThemeProvider';
export * from './useTheme';
export * from './navigation-theme';
