import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, borderRadius } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface ProgressBarProps {
  progress: number;
  max?: number;
  height?: number;
  color?: string;
  gradientColors?: string[];
  backgroundColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  max = 100,
  height = 8,
  color = colors.primary,
  gradientColors,
  backgroundColor = colors.border,
}) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const percentage = Math.min((progress / max) * 100, 100);

  useEffect(() => {
    Animated.spring(animatedWidth, {
      toValue: percentage,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const width = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { height, backgroundColor, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.progress, { width }]}>
        {gradientColors ? (
          <LinearGradient
            colors={gradientColors as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.gradient, { borderRadius: height / 2 }]}
          />
        ) : (
          <View style={[styles.solidBar, { backgroundColor: color, borderRadius: height / 2 }]} />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
  },
  gradient: {
    flex: 1,
    height: '100%',
  },
  solidBar: {
    flex: 1,
    height: '100%',
  },
});
