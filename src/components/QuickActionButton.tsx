import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { colors, spacing, borderRadius, shadows, fontSizes } from '../constants/theme';
import { PlatformPressable } from './AnimatedPressable';

interface QuickActionButtonProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  backgroundColor?: string;
  icon?: React.ReactNode;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  title,
  subtitle,
  onPress,
  backgroundColor = colors.primary,
  icon,
}) => {
  return (
    <PlatformPressable
      onPress={onPress}
      pressScale={0.95}
      style={[styles.button, { backgroundColor }, shadows.md]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </PlatformPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
  },
  iconContainer: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.surface,
    marginBottom: spacing.xs,
    fontFamily: 'Poppins_700Bold',
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.surface,
    opacity: 0.9,
    fontWeight: '500',
    fontFamily: 'Quicksand_500Medium',
  },
});
