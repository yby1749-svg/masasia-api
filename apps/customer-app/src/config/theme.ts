// Masasia Design System - Warm Gold/Beige Premium Spa Theme
// Style: Vibrant & Colorful (Grab/Gojek inspired)

export const colors = {
  // Primary - Warm Gold (Luxury, Comfort)
  primary: '#C9A962',
  primaryDark: '#A68B4B',
  primaryLight: '#E5D4A1',
  primarySoft: '#F7F1E3',

  // Secondary - Warm Coral (Energy, Warmth)
  secondary: '#E07A5F',
  secondaryDark: '#C96A50',
  secondaryLight: '#F0A995',

  // Accent - Soft Sage (Balance, Calm)
  accent: '#81B29A',
  accentDark: '#6A9A82',
  accentLight: '#A8D4BE',

  // Status Colors
  success: '#81B29A',
  warning: '#E9C46A',
  error: '#E07A5F',
  info: '#7BA7BC',

  // Backgrounds - Cream Tones
  background: '#FFFCF7',
  surface: '#FFF9F0',
  card: '#FFFFFF',

  // Text - Warm Brown (No pure black)
  text: '#2D2A26',
  textSecondary: '#6B645A',
  textLight: '#A39E94',
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E8E2D9',
  divider: '#F5F0E8',

  // Overlay
  overlay: 'rgba(45, 42, 38, 0.5)',
};

// Gradient Colors
export const gradients = {
  primary: ['#C9A962', '#E5D4A1'],
  hero: ['#C9A962', '#F7F1E3', '#FFFCF7'],
  gold: ['#C9A962', '#D4B978', '#E5D4A1'],
  warm: ['#E07A5F', '#F0A995'],
  sage: ['#81B29A', '#A8D4BE'],
  sunset: ['#C9A962', '#E07A5F'],
  card: ['#FFFFFF', '#FFF9F0'],
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
    shadowColor: '#2D2A26',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#2D2A26',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#2D2A26',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  xl: {
    shadowColor: '#2D2A26',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  // Gold glow for primary elements
  primaryGlow: {
    shadowColor: '#C9A962',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  // Card shadow
  card: {
    shadowColor: '#2D2A26',
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
