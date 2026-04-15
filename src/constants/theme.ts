export const colors = {
  primary: '#7C3AED',
  primaryDark: '#2D1B69',
  primaryLight: '#B794F4',
  primaryPale: '#EDE9FE',
  secondary: '#FF477E',
  secondaryLight: '#FFA8C5',
  accent: '#00F0FF',
  accentLight: '#A5F3FC',
  background: '#F4F6FB',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardGlass: 'rgba(255, 255, 255, 0.85)',
  textPrimary: '#1A1A24',
  textSecondary: '#8A8A9D',
  textLight: '#FFFFFF',
  border: '#EAEDF4',
  error: '#FF477E',
  success: '#6FCF97',
  warning: '#FFB347',
  glassOverlay: 'rgba(124, 58, 237, 0.08)',
  glassBorder: 'rgba(124, 58, 237, 0.2)',
  statSteps: 'rgba(124, 58, 237, 0.15)',
  statCalories: 'rgba(255, 71, 126, 0.15)',
  statExercise: 'rgba(0, 240, 255, 0.15)',
  statWater: 'rgba(100, 200, 255, 0.15)',
  statSleep: 'rgba(45, 27, 105, 0.15)',
  statHeart: 'rgba(255, 81, 47, 0.15)',
  purple: '#7C3AED',
  teal: '#00F0FF',
  orange: '#FF512F',
  coral: '#FF477E',
  lavender: '#B794F4',
  mint: '#6FCF97',
  info: '#0088FF',
  gold: '#FFD700',
};

export const gradients = {
  primary: ['#7C3AED', '#FF477E'],
  primaryBold: ['#2D1B69', '#1A1040'],
  secondary: ['#FF512F', '#DD2476'],
  accent: ['#00F0FF', '#0088FF'],
  purple: ['#7C3AED', '#2D1B69'],
  ocean: ['#00F0FF', '#0088FF'],
  sunset: ['#FF512F', '#DD2476'],
  greenGlow: ['#6FCF97', '#7BDCB5'],
  coral: ['#FF477E', '#FFB085'],
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
