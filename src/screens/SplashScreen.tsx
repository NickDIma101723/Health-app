import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { colors, fontSizes, spacing, borderRadius } from '../constants/theme';

interface SplashScreenProps {
  onFinish: () => void;
}

const { width } = Dimensions.get('window');

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [exitAnimation, setExitAnimation] = useState(false);

  const handleGetStarted = () => {
    setExitAnimation(true);
    setTimeout(() => onFinish(), 400);
  };

  return (
    <View style={styles.container}>
      <MotiView
        style={styles.content}
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: exitAnimation ? 0 : 1, 
          scale: exitAnimation ? 0.9 : 1 
        }}
        transition={{ 
          type: 'timing',
          duration: exitAnimation ? 300 : 800,
        }}
      >
        <MotiView 
          style={styles.illustrationContainer}
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            type: 'spring',
            delay: 100,
            damping: 15,
          }}
        >
          <View style={styles.illustrationBackground}>
            <MotiView 
              style={[styles.decorativeCircle, styles.circle1]}
              from={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.2 }}
              transition={{ 
                type: 'spring',
                delay: 200,
                damping: 12,
              }}
            />
            <MotiView 
              style={[styles.decorativeCircle, styles.circle2]}
              from={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.25 }}
              transition={{ 
                type: 'spring',
                delay: 300,
                damping: 12,
              }}
            />
            <MotiView 
              style={[styles.decorativeCircle, styles.circle3]}
              from={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.3 }}
              transition={{ 
                type: 'spring',
                delay: 400,
                damping: 12,
              }}
            />
          </View>
          
          <MotiView 
            style={styles.logoCircle}
            from={{ scale: 0, rotate: '-180deg' }}
            animate={{ scale: 1, rotate: '0deg' }}
            transition={{ 
              type: 'spring',
              delay: 500,
              damping: 10,
            }}
          >
            <Text style={styles.logoText}>A</Text>
          </MotiView>
          
          <View style={styles.illustrationAccents}>
            <MotiView 
              style={[styles.accentDot, styles.dot1]}
              from={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: 'spring',
                delay: 700,
                damping: 8,
              }}
            />
            <MotiView 
              style={[styles.accentDot, styles.dot2]}
              from={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: 'spring',
                delay: 800,
                damping: 8,
              }}
            />
            <MotiView 
              style={[styles.accentDot, styles.dot3]}
              from={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: 'spring',
                delay: 900,
                damping: 8,
              }}
            />
          </View>
        </MotiView>

        <View style={styles.textContent}>
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ 
              type: 'timing',
              delay: 600,
              duration: 600,
            }}
          >
            <Text style={styles.brandName}>Aria</Text>
          </MotiView>
          
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ 
              type: 'timing',
              delay: 700,
              duration: 600,
            }}
          >
            <Text style={styles.tagline}>Health & Wellness</Text>
          </MotiView>
          
          <MotiView
            from={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ 
              type: 'spring',
              delay: 900,
              damping: 15,
            }}
          >
            <Text style={styles.welcomeText}>
              Welcome to your{'\n'}wellness journey
            </Text>
            <Text style={styles.description}>
              Track your health, connect with coaches,{'\n'}and achieve your wellness goals
            </Text>
          </MotiView>
        </View>
      </MotiView>

      <MotiView
        style={styles.buttonContainer}
        from={{ opacity: 0, scale: 0.8, translateY: 30 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ 
          type: 'spring',
          delay: 1100,
          damping: 15,
        }}
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
      </MotiView>
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
    boxShadow: '0px 8px 20px rgba(109, 207, 246, 0.3)',
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
    boxShadow: '0px 6px 12px rgba(109, 207, 246, 0.25)',
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
