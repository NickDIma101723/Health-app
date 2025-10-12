import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, shadows, fontSizes } from '../constants/theme';

interface StatCardProps {
  value: string;
  label: string;
  backgroundColor?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  value, 
  label, 
  backgroundColor = colors.cardGlass,
  icon 
}) => {
  return (
    <View style={[styles.card, { backgroundColor }, shadows.glass]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  iconContainer: {
    marginBottom: spacing.sm,
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
});
