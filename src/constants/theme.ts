export const colors = {
  primary: '#6FCF97',
  primaryDark: '#4CAF79',
  primaryLight: '#A8E6C1',
  primaryPale: '#E8F8F1',
  secondary: '#7BDCB5',
  secondaryLight: '#A8F0D5',
  accent: '#FFB085',
  accentLight: '#FFCDC7',
  background: '#F7FCF9',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardGlass: 'rgba(255, 255, 255, 0.85)',
  textPrimary: '#1C1C1C',
  textSecondary: '#6C6C6C',
  textLight: '#FFFFFF',
  border: '#E8F8F1',
  error: '#FF9AA2',
  success: '#6FCF97',
  warning: '#FFD97D',
  glassOverlay: 'rgba(111, 207, 151, 0.08)',
  glassBorder: 'rgba(111, 207, 151, 0.2)',
  statSteps: 'rgba(111, 207, 151, 0.15)',
  statCalories: 'rgba(255, 176, 133, 0.15)',
  statExercise: 'rgba(123, 220, 181, 0.15)',
  statWater: 'rgba(100, 200, 255, 0.15)',
  statSleep: 'rgba(155, 135, 245, 0.15)',
  statHeart: 'rgba(255, 138, 148, 0.15)',
  purple: '#9B87F5',
  teal: '#64C8FF',
  orange: '#FFB347',
  coral: '#FF8A94',
  lavender: '#C4B5FD',
  mint: '#7BDCB5',
  info: '#64C8FF',
  gold: '#FFD700',
};

export const gradients = {
  primary: ['#6FCF97', '#A8E6C1'],
  primaryBold: ['#4CAF79', '#6FCF97'],
  secondary: ['#7BDCB5', '#A8F0D5'],
  accent: ['#FFB085', '#FFCDC7'],
  purple: ['#9B87F5', '#C4B5FD'],
  ocean: ['#64C8FF', '#7BDCB5'],
  sunset: ['#FFB347', '#FFA69E'],
  greenGlow: ['#6FCF97', '#7BDCB5'],
  coral: ['#FF8A94', '#FFB085'],
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
