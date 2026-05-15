export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    tint: '#2563EB',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#2563EB',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#60A5FA',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#60A5FA',
  },
} as const;

export const Fonts = {
  rounded: 'System',
  mono: 'Courier',
} as const;


export const theme = {
  colors: {
    primary: {
      black: '#000000',
      charcoal: '#0B0B0F',
      slate: '#111827',
      gray: '#1F2937',
    },
    accent: {
      silver: '#D1D5DB',
      blueGlow: '#3B82F6',
      white: '#FFFFFF',
    },
    border: 'rgba(255, 255, 255, 0.1)',
    text: {
      primary: '#FFFFFF',
      secondary: '#9CA3AF',
      inverse: '#000000',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },
};
