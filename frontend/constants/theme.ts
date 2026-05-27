// export const Colors = {
//   light: {
//     text: '#11181C',
//     background: '#FFFFFF',
//     tint: '#2563EB',
//     icon: '#687076',
//     tabIconDefault: '#687076',
//     tabIconSelected: '#2563EB',
//   },
//   dark: {
//     text: '#ECEDEE',
//     background: '#151718',
//     tint: '#60A5FA',
//     icon: '#9BA1A6',
//     tabIconDefault: '#9BA1A6',
//     tabIconSelected: '#60A5FA',
//   },
// } as const;

// export const Fonts = {
//   rounded: 'System',
//   mono: 'Courier',
// } as const;

// export const theme = {
//   colors: {
//     primary: {
//       black: '#000000',
//       charcoal: '#0B0B0F',
//       slate: '#111827',
//       gray: '#1F2937',
//     },
//     accent: {
//       silver: '#D1D5DB',
//       blueGlow: '#3B82F6',
//       white: '#FFFFFF',
//     },
//     border: 'rgba(255, 255, 255, 0.1)',
//     text: {
//       primary: '#FFFFFF',
//       secondary: '#9CA3AF',
//       inverse: '#000000',
//     },
//   },
//   spacing: {
//     xs: 4,
//     sm: 8,
//     md: 16,
//     lg: 24,
//     xl: 32,
//     xxl: 48,
//   },
//   radius: {
//     sm: 8,
//     md: 12,
//     lg: 16,
//     full: 9999,
//   },
// };

export const Colors = {
  light: {
    text: '#0F172A',
    background: '#F8FAFC',
    tint: '#2563EB',
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#2563EB',
  },

  dark: {
    text: '#F8FAFC',
    background: '#020617',
    tint: '#60A5FA',
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: '#60A5FA',
  },
} as const;

export const Fonts = {
  heading: 'SpaceGrotesk_700Bold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
} as const;

export const theme = {
  colors: {
    background: {
      primary: '#020617',
      secondary: '#0F172A',
      tertiary: '#111827',
      elevated: '#172033',
    },

    primary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },

    accent: {
      glow: '#60A5FA',
      cyan: '#38BDF8',
      white: '#FFFFFF',
    },

    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      muted: '#64748B',
      dark: '#0F172A',
    },

    border: {
      primary: 'rgba(255,255,255,0.08)',
      secondary: 'rgba(96,165,250,0.15)',
    },

    status: {
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },

  radius: {
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    full: 9999,
  },

  shadow: {
    blueGlow: {
      shadowColor: '#3B82F6',
      shadowOpacity: 0.25,
      shadowRadius: 30,
      shadowOffset: {
        width: 0,
        height: 16,
      },
      elevation: 14,
    },
  },
} as const;