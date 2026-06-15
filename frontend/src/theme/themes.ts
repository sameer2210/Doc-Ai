import { darkColors, lightColors } from './colors';
import type { AppTheme } from './types';

const baseRadii = {
  md: 16,
  lg: 20,
  xl: 24,
  full: 999,
} as const;

const baseSpacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 48,
} as const;

export const darkTheme: AppTheme = {
  colors: darkColors,
  radii: baseRadii,
  spacing: baseSpacing,
};

export const lightTheme: AppTheme = {
  colors: lightColors,
  radii: baseRadii,
  spacing: baseSpacing,
};
