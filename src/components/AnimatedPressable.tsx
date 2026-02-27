import React, { useCallback } from 'react';
import {
  Pressable,
  Platform,
  StyleProp,
  ViewStyle,
  PressableProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PlatformPressableProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale when pressed (default 0.97) */
  pressScale?: number;
  /** Enable haptic feedback on press (default true) */
  haptic?: boolean;
  /** Haptic impact style */
  hapticStyle?: Haptics.ImpactFeedbackStyle;
  /** Android ripple color — set to null to disable ripple */
  rippleColor?: string | null;
}

/**
 * Platform-aware pressable with:
 * - Android: Material ripple effect + spring scale
 * - iOS: Opacity fade + spring scale
 * - Both: Optional haptic feedback via expo-haptics
 *
 * Uses react-native-reanimated for 60fps UI-thread animations.
 */
export const PlatformPressable: React.FC<PlatformPressableProps> = ({
  children,
  style,
  pressScale = 0.97,
  haptic = true,
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
  rippleColor = 'rgba(124, 58, 237, 0.15)',
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = withSpring(pressScale, { damping: 15, stiffness: 400 });
      if (Platform.OS === 'ios') {
        opacity.value = withTiming(0.85, { duration: 100 });
      }
      onPressIn?.(e);
    },
    [pressScale, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 150 });
      onPressOut?.(e);
    },
    [onPressOut],
  );

  const handlePress = useCallback(
    (e: any) => {
      if (haptic) {
        Haptics.impactAsync(hapticStyle);
      }
      onPress?.(e);
    },
    [haptic, hapticStyle, onPress],
  );

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      android_ripple={
        Platform.OS === 'android' && rippleColor
          ? { color: rippleColor, borderless: false }
          : undefined
      }
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
};
