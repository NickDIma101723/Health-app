import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, shadows, fontSizes } from '../constants/theme';
import { CircularProgress } from './CircularProgress';
import { ProgressBar } from './ProgressBar';

type ProgressType = 'circular' | 'bar' | 'none';

interface EnhancedStatCardProps {
  value: string;
  label: string;
  subtitle?: string;
  progress?: number;
  maxProgress?: number;
  progressType?: ProgressType;
  backgroundColor?: string;
  gradientColors?: string[];
  progressColor?: string;
  progressGradient?: string[];
  icon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

export const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({
  value,
  label,
  subtitle,
  progress = 0,
  maxProgress = 100,
  progressType = 'none',
  backgroundColor = colors.cardGlass,
  gradientColors,
  progressColor = colors.primary,
  progressGradient,
  icon,
  size = 'medium',
}) => {
  const cardHeight = size === 'small' ? 120 : size === 'large' ? 180 : 140;
  
  const renderProgress = () => {
    if (progressType === 'circular') {
      return (
        <CircularProgress
          size={60}
          strokeWidth={6}
          progress={progress}
          max={maxProgress}
          color={progressColor}
          gradientColors={progressGradient}
        />
      );
    }
    
    if (progressType === 'bar') {
      return (
        <ProgressBar
          progress={progress}
          max={maxProgress}
          height={6}
          color={progressColor}
          gradientColors={progressGradient}
        />
      );
    }
    
    return null;
  };

  const CardContent = (
    <View style={[styles.card, { minHeight: cardHeight }, shadows.glass]}>
      <View style={styles.header}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <View style={styles.textContainer}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.label}>{label}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      
      {progressType === 'circular' && (
        <View style={styles.circularProgressContainer}>
          {renderProgress()}
        </View>
      )}
      
      {progressType === 'bar' && (
        <View style={styles.barProgressContainer}>
          {renderProgress()}
        </View>
      )}
    </View>
  );

  if (gradientColors) {
    return (
      <LinearGradient
        colors={gradientColors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientCard, { minHeight: cardHeight, borderRadius: borderRadius.xl }]}
      >
        {CardContent}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor }]}>
      {CardContent}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: '45%',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  gradientCard: {
    flex: 1,
    minWidth: '45%',
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  value: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
    fontFamily: 'Poppins_700Bold',
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Quicksand_500Medium',
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
    fontFamily: 'Quicksand_500Medium',
  },
  circularProgressContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  barProgressContainer: {
    marginTop: spacing.md,
  },
});
