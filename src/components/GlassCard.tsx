import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Blur intensity 1-100, only effective on iOS (default 40) */
  intensity?: number;
  /** Blur tint: light, dark, default (default 'dark') */
  tint?: 'light' | 'dark' | 'default';
  /** Animated entry — uses reanimated FadeIn (default true) */
  animated?: boolean;
  /** Entry animation duration ms (default 500) */
  enterDuration?: number;
}

/**
 * Glassmorphism card component:
 * - iOS: Real BlurView from expo-blur for translucent glass effect
 * - Android: Semi-transparent fallback (Android blur is expensive)
 *
 * Wraps in reanimated Animated.View for smooth enter/exit transitions.
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 40,
  tint = 'dark',
  animated = true,
  enterDuration = 500,
}) => {
  const Wrapper = animated ? Animated.View : View;
  const enterProps = animated
    ? { entering: FadeIn.duration(enterDuration), exiting: FadeOut.duration(300) }
    : {};

  if (Platform.OS === 'ios') {
    return (
      <Wrapper {...enterProps} style={[styles.container, style]}>
        <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>{children}</View>
      </Wrapper>
    );
  }

  // Android fallback — semi-transparent background
  const bgColor =
    tint === 'dark'
      ? 'rgba(0, 0, 0, 0.65)'
      : tint === 'light'
        ? 'rgba(255, 255, 255, 0.75)'
        : 'rgba(30, 30, 46, 0.7)';

  return (
    <Wrapper {...enterProps} style={[styles.container, { backgroundColor: bgColor }, style]}>
      <View style={styles.content}>{children}</View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  content: {
    padding: 20,
  },
});
