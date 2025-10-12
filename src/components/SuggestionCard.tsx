import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, shadows, fontSizes } from '../constants/theme';

interface SuggestionCardProps {
  title: string;
  description: string;
  actionLabel?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  gradientColors?: string[];
  backgroundColor?: string;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  title,
  description,
  actionLabel = 'Try now',
  onPress,
  icon,
  gradientColors,
  backgroundColor = colors.cardGlass,
}) => {
  const CardContent = (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={!onPress}
    >
      <View style={styles.content}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
      
      {onPress && (
        <View style={styles.actionContainer}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
          <Text style={styles.arrow}>→</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (gradientColors) {
    return (
      <View style={[styles.wrapper, shadows.md]}>
        <LinearGradient
          colors={gradientColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {CardContent}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor }, shadows.md]}>
      {CardContent}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  gradient: {
    borderRadius: borderRadius.xl,
  },
  card: {
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: 'Poppins_700Bold',
  },
  description: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: 'Quicksand_500Medium',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  actionLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 4,
    fontFamily: 'Quicksand_600SemiBold',
  },
  arrow: {
    fontSize: fontSizes.lg,
    color: colors.primary,
    fontWeight: '700',
  },
});
