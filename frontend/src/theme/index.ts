export const appTheme = {
  colors: {
    background: {
      base: '#06080D',
      elevated: '#0B1018',
      surface: 'rgba(16, 22, 34, 0.78)',
      surfaceStrong: 'rgba(21, 29, 44, 0.92)',
    },
    accent: {
      primary: '#6EA8FF',
      secondary: '#7CD8C0',
      mutedGold: '#A78A5A',
    },
    text: {
      primary: '#F7FAFF',
      secondary: '#9AA8C7',
      tertiary: '#6F7D96',
      success: '#7CE5A5',
      danger: '#F19494',
    },
    border: {
      subtle: 'rgba(203, 219, 255, 0.16)',
      soft: 'rgba(163, 180, 214, 0.22)',
    },
  },
  radii: {
    md: 16,
    lg: 20,
    xl: 24,
    full: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 28,
  },
} as const;

export type AppTheme = typeof appTheme;
