// Masasia Design System - Purple & Green Premium Spa Theme
// Based on Masasia logo colors with gold accents

export const colors = {
  // Primary - Masasia Purple (Brand Identity)
  primary: '#7B4FA0',
  primaryDark: '#5E3D7A',
  primaryLight: '#A77DC4',
  primarySoft: '#F3EDF7',

  // Secondary - Warm Gold (Luxury, Premium)
  secondary: '#C9A962',
  secondaryDark: '#A68B4B',
  secondaryLight: '#E5D4A1',

  // Accent - Masasia Green (Balance, Natural)
  accent: '#6B8E4E',
  accentDark: '#557239',
  accentLight: '#8FB36E',

  // Status Colors
  success: '#6B8E4E',
  warning: '#E9C46A',
  error: '#E07A5F',
  info: '#7BA7BC',

  // Backgrounds - Cream Tones (from logo)
  background: '#FFF8E7',
  surface: '#FFFAF0',
  card: '#FFFFFF',

  // Text - Deep Purple/Brown (No pure black)
  text: '#2D2A33',
  textSecondary: '#5E5A66',
  textLight: '#9A95A3',
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E8E2D9',
  divider: '#F5F0E8',

  // Overlay
  overlay: 'rgba(45, 42, 51, 0.5)',

  // Provider-specific colors
  online: '#6B8E4E',
  offline: '#9A95A3',
  busy: '#E9C46A',
};

// Gradient Colors
export const gradients = {
  primary: ['#7B4FA0', '#A77DC4'],
  hero: ['#7B4FA0', '#F3EDF7', '#FFF8E7'],
  gold: ['#C9A962', '#D4B978', '#E5D4A1'],
  purple: ['#7B4FA0', '#9B6FC0', '#A77DC4'],
  green: ['#6B8E4E', '#8FB36E'],
  sunset: ['#7B4FA0', '#C9A962'],
  card: ['#FFFFFF', '#FFFAF0'],
  // Provider status gradients
  online: ['#6B8E4E', '#8FB36E'],
  earnings: ['#C9A962', '#E9C46A'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  // Touch targets
  touchMinimum: 44,
  touchComfortable: 56,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
};

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#2D2A33',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#2D2A33',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#2D2A33',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  xl: {
    shadowColor: '#2D2A33',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  // Purple glow for primary elements
  primaryGlow: {
    shadowColor: '#7B4FA0',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  // Gold glow for secondary elements
  goldGlow: {
    shadowColor: '#C9A962',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  // Card shadow
  card: {
    shadowColor: '#2D2A33',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
};

// Animation durations
export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
};

// Common component sizes
export const componentSizes = {
  buttonHeight: 52,
  buttonHeightSmall: 44,
  inputHeight: 56,
  iconSize: 24,
  iconSizeSmall: 20,
  iconSizeLarge: 32,
  avatarSmall: 40,
  avatarMedium: 56,
  avatarLarge: 80,
};
