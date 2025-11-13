import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { colors, fontSizes, spacing, borderRadius } from '../constants/theme';

interface SplashScreenProps {
  onFinish: () => void;
}

const { width } = Dimensions.get('window');

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: false,
        }),
      ]),
      Animated.parallel([
        Animated.spring(slideUpAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: false,
        }),
        Animated.timing(buttonFadeAnim, {
          toValue: 1,
          duration: 600,
          delay: 200,
          useNativeDriver: false,
        }),
        Animated.spring(buttonScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          delay: 200,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => onFinish());
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationBackground}>
            <View style={[styles.decorativeCircle, styles.circle1]} />
            <View style={[styles.decorativeCircle, styles.circle2]} />
            <View style={[styles.decorativeCircle, styles.circle3]} />
          </View>
          
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>A</Text>
          </View>
          
          <View style={styles.illustrationAccents}>
            <View style={[styles.accentDot, styles.dot1]} />
            <View style={[styles.accentDot, styles.dot2]} />
            <View style={[styles.accentDot, styles.dot3]} />
          </View>
        </View>

        <View style={styles.textContent}>
          <Text style={styles.brandName}>Aria</Text>
          <Text style={styles.tagline}>Health & Wellness</Text>
          
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            }}
          >
            <Text style={styles.welcomeText}>
              Welcome to your{'\n'}wellness journey
            </Text>
            <Text style={styles.description}>
              Track your health, connect with coaches,{'\n'}and achieve your wellness goals
            </Text>
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: buttonFadeAnim,
            transform: [{ scale: buttonScaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>Get Started</Text>
          <View style={styles.buttonArrow}>
            <Text style={styles.arrowIcon}>→</Text>
          </View>
        </TouchableOpacity>
        
        <Text style={styles.footerText}>
          Tap to begin your journey
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingVertical: spacing.xxxl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  illustrationContainer: {
    width: width * 0.7,
    height: width * 0.7,
    maxWidth: 280,
    maxHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    position: 'relative',
  },
  illustrationBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  circle1: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    opacity: 0.2,
  },
  circle2: {
    width: '75%',
    height: '75%',
    backgroundColor: colors.secondary,
    opacity: 0.25,
    top: '12.5%',
    left: '12.5%',
  },
  circle3: {
    width: '50%',
    height: '50%',
    backgroundColor: colors.accent,
    opacity: 0.3,
    top: '25%',
    left: '25%',
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 72,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  illustrationAccents: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  accentDot: {
    position: 'absolute',
    borderRadius: 9999,
  },
  dot1: {
    width: 12,
    height: 12,
    backgroundColor: colors.secondary,
    top: '10%',
    right: '15%',
  },
  dot2: {
    width: 16,
    height: 16,
    backgroundColor: colors.accent,
    bottom: '20%',
    left: '10%',
  },
  dot3: {
    width: 10,
    height: 10,
    backgroundColor: colors.primary,
    top: '30%',
    left: '5%',
  },
  textContent: {
    alignItems: 'center',
    width: '100%',
  },
  brandName: {
    fontSize: fontSizes.xxxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -1,
    fontFamily: 'Poppins_700Bold',
  },
  tagline: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.xl,
    fontWeight: '500',
    fontFamily: 'Quicksand_600SemiBold',
  },
  welcomeText: {
    fontSize: fontSizes.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 32,
    fontFamily: 'Poppins_700Bold',
  },
  description: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Quicksand_500Medium',
  },
  buttonContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 320,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: spacing.sm,
    fontFamily: 'Poppins_700Bold',
  },
  buttonArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowIcon: {
    fontSize: fontSizes.lg,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footerText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
