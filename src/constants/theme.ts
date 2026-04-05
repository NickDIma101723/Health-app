export const colors = {
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  primaryLight: '#A78BFA',
  primaryPale: 'rgba(124, 58, 237, 0.15)',
  secondary: '#FF477E',
  secondaryLight: '#FF6B9A',
  accent: '#00F0FF',
  accentLight: '#B8FF00',
  background: '#0D0D14',
  surface: '#1A1A28',
  card: '#1A1A28',
  cardGlass: 'rgba(26, 26, 40, 0.85)',
  textPrimary: '#FFFFFF',
  textSecondary: '#6B6B80',
  textLight: '#FFFFFF',
  border: '#2A2A3C',
  error: '#FF477E',
  success: '#B8FF00',
  warning: '#FF8A00',
  glassOverlay: 'rgba(124, 58, 237, 0.08)',
  glassBorder: 'rgba(124, 58, 237, 0.2)',
  statSteps: 'rgba(0, 240, 255, 0.15)',
  statCalories: 'rgba(255, 138, 0, 0.15)',
  statExercise: 'rgba(124, 58, 237, 0.15)',
  statWater: 'rgba(0, 136, 255, 0.15)',
  statSleep: 'rgba(124, 58, 237, 0.15)',
  statHeart: 'rgba(255, 71, 126, 0.15)',
  purple: '#7C3AED',
  teal: '#00F0FF',
  orange: '#FF8A00',
  coral: '#FF477E',
  lavender: '#A78BFA',
  mint: '#B8FF00',
  info: '#0088FF',
  gold: '#FF8A00',
};

export const gradients = {
  primary: ['#7C3AED', '#A78BFA'] as const,
  primaryBold: ['#5B21B6', '#7C3AED'] as const,
  secondary: ['#FF477E', '#FF6B9A'] as const,
  accent: ['#00F0FF', '#0088FF'] as const,
  purple: ['#7C3AED', '#FF477E'] as const,
  ocean: ['#0088FF', '#00F0FF'] as const,
  sunset: ['#FF512F', '#DD2476'] as const,
  greenGlow: ['#B8FF00', '#00F0FF'] as const,
  coral: ['#FF477E', '#FF512F'] as const,
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  full: 9999,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 42,
};

export const shadows = {
  sm: {
    // React Native properties
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    // Web property
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
  },
  glass: {
    shadowColor: '#6C9EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    boxShadow: '0 4px 20px rgba(108, 158, 255, 0.1)',
  },
};

export const animations = {
  fast: 200,
  medium: 300,
  slow: 500,
};

/** Premium font families — loaded via expo-font in App.tsx */
export const fonts = {
  inter: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  jakarta: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semiBold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
  },
  poppins: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
  },
  pixel: 'DotGothic16_400Regular',
} as const;
