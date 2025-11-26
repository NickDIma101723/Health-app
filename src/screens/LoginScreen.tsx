import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Modal,
} from 'react-native';
import { Button, Input } from '../components/ui';
import { colors, spacing, fontSizes, borderRadius } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    console.log('[LoginScreen] Attempting login...');
    setLoading(true);
    setErrors({});
    
    try {
      const { error } = await signIn(email.trim(), password.trim());
      setLoading(false);

      if (error) {
        console.error('[LoginScreen] Login error:', error);
        const newErrors: { email?: string; password?: string } = {};
        
        if (error.message.includes('Invalid login credentials')) {
          newErrors.password = 'Wrong password or email';
        } else if (error.message.includes('Email not confirmed')) {
          newErrors.email = 'Please verify your email address first';
        } else if (error.message.includes('User not found')) {
          newErrors.email = 'No account found with this email';
        } else {
          newErrors.password = error.message || 'Login failed';
        }
        
        setErrors(newErrors);
      } else {
        console.log('[LoginScreen] ✅ Login successful');
      }
    } catch (err) {
      console.error('[LoginScreen] Unexpected error:', err);
      setLoading(false);
      setErrors({ password: 'An unexpected error occurred. Please try again.' });
    }
  };

  const handleForgotPassword = () => {
    setResetEmail(email);
    setShowResetModal(true);
  };

  const handleResetPassword = async () => {
    if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail)) {
      return;
    }

    setResetLoading(true);
    const { error } = await resetPassword(resetEmail);
    setResetLoading(false);

    if (error) {
      setShowResetModal(false);
    } else {
      setShowResetModal(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.decorativeShapes}>
            <View style={[styles.shape, styles.shapeOne]} />
            <View style={[styles.shape, styles.shapeTwo]} />
          </View>
          
          <Text style={styles.greeting}>Welcome</Text>
          <Text style={styles.title}>Let's start your wellness journey</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Input
            placeholder="Your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />

          <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            variant="primary"
            size="lg"
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to Aria? </Text>
            <TouchableOpacity onPress={onNavigateToRegister}>
              <Text style={styles.footerLink}>Create account</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalDescription}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
            
            <Input
              placeholder="Your email"
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowResetModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleResetPassword}
                disabled={resetLoading}
              >
                <Text style={styles.modalButtonConfirmText} numberOfLines={1}>
                  {resetLoading ? 'Sending...' : 'Send Reset'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xxxl,
    position: 'relative',
  },
  decorativeShapes: {
    position: 'absolute',
    top: -20,
    right: 0,
    width: 100,
    height: 100,
  },
  shape: {
    position: 'absolute',
    borderRadius: borderRadius.full,
  },
  shapeOne: {
    width: 60,
    height: 60,
    backgroundColor: colors.primaryLight,
    top: 0,
    right: 0,
  },
  shapeTwo: {
    width: 40,
    height: 40,
    backgroundColor: colors.secondaryLight,
    bottom: 0,
    left: 20,
  },
  greeting: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: 'Quicksand_600SemiBold',
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 42,
    letterSpacing: -0.5,
    fontFamily: 'Poppins_700Bold',
  },
  formContainer: {
    gap: spacing.md,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    fontFamily: 'Quicksand_600SemiBold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
  },
  footerLink: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: '600',
    fontFamily: 'Poppins_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: 'Poppins_700Bold',
  },
  modalDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
    fontFamily: 'Quicksand_500Medium',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonConfirmText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Quicksand_600SemiBold',
    textAlign: 'center',
  },
});
