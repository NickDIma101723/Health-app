import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius, shadows, fontSizes } from '../constants/theme';

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
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: false,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor }, shadows.md]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {icon && <Animated.View style={styles.iconContainer}>{icon}</Animated.View>}
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </TouchableOpacity>
    </Animated.View>
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
