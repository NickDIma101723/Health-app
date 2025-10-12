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
} from 'react-native';
import { Button, Input } from '../components/ui';
import { colors, spacing, fontSizes, borderRadius } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin }) => {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    consent?: string;
  }>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

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

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!consentGiven) {
      newErrors.consent = 'Please accept the terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      if (errors.consent) {
        Alert.alert('Consent Required', errors.consent);
      }
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);

    if (error) {
      let errorMessage = 'An unexpected error occurred';
      
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        errorMessage = 'This email is already registered. Please sign in or use password reset if you forgot your password.';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Too many attempts. Please try again in a few minutes.';
      } else if (error.message.includes('Password')) {
        errorMessage = 'Password is too weak. Please use at least 6 characters.';
      } else if (error.message.includes('email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } else {
      Alert.alert(
        'Account Created!',
        'Please check your email to verify your account before signing in.',
        [{ text: 'OK' }]
      );
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
            <View style={[styles.shape, styles.shapeThree]} />
          </View>
          
          <Text style={styles.greeting}>Get started</Text>
          <Text style={styles.title}>Create your wellness account</Text>
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
            placeholder="Full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            error={errors.name}
          />

          <Input
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />

          <Input
            placeholder="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            error={errors.confirmPassword}
          />

          <TouchableOpacity
            style={styles.consentContainer}
            onPress={() => setConsentGiven(!consentGiven)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, consentGiven && styles.checkboxChecked]}>
              {consentGiven && <View style={styles.checkboxDot} />}
            </View>
            <Text style={styles.consentText}>
              I agree to the Terms of Service and Privacy Policy
            </Text>
          </TouchableOpacity>

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            variant="primary"
            size="lg"
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
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
    marginBottom: spacing.xxl,
    position: 'relative',
  },
  decorativeShapes: {
    position: 'absolute',
    top: -20,
    right: 0,
    width: 120,
    height: 120,
  },
  shape: {
    position: 'absolute',
    borderRadius: borderRadius.full,
  },
  shapeOne: {
    width: 50,
    height: 50,
    backgroundColor: colors.accentLight,
    top: 0,
    right: 0,
  },
  shapeTwo: {
    width: 35,
    height: 35,
    backgroundColor: colors.teal,
    bottom: 20,
    left: 30,
  },
  shapeThree: {
    width: 25,
    height: 25,
    backgroundColor: colors.secondaryLight,
    bottom: 0,
    right: 40,
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
  consentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  checkboxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  consentText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: 'Quicksand_500Medium',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
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
});
