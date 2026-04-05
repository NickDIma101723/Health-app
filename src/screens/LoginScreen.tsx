import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Eye, EyeSlash, EnvelopeSimple, Lock } from 'phosphor-react-native';
import { useAuth } from '../contexts/AuthContext';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

const C = {
  bg: '#FAFAFA', card: '#FFFFFF', cardDark: '#111111',
  accent: '#10B981', accentSoft: '#ECFDF5', lime: '#D4F940',
  warmBg: '#F5F0EB', text: '#1A1A1A', dim: '#8C8C8C',
  border: '#EEEEEE', red: '#EF4444',
};
const F = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
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
        console.log('[LoginScreen] Login successful');
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
    if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail)) return;
    setResetLoading(true);
    await resetPassword(resetEmail);
    setResetLoading(false);
    setShowResetModal(false);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={s.header}>
          <View style={s.logoBadge}>
            <Text style={s.logoLetter}>A</Text>
          </View>
          <Text style={s.greeting}>WELCOME BACK</Text>
          <Text style={s.title}>Sign in to{'\n'}your account</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={s.form}>
          {/* Email */}
          <View>
            <Text style={s.label}>Email</Text>
            <View style={[s.inputWrap, emailFocused && s.inputFocused, errors.email ? s.inputError : null]}>
              <EnvelopeSimple size={18} color={emailFocused ? C.accent : C.dim} weight="bold" />
              <TextInput
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor={C.dim}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
            {errors.email ? <Text style={s.errorText}>{errors.email}</Text> : null}
          </View>

          {/* Password */}
          <View>
            <Text style={s.label}>Password</Text>
            <View style={[s.inputWrap, passwordFocused && s.inputFocused, errors.password ? s.inputError : null]}>
              <Lock size={18} color={passwordFocused ? C.accent : C.dim} weight="bold" />
              <TextInput
                style={s.input}
                placeholder="Enter your password"
                placeholderTextColor={C.dim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                {showPassword
                  ? <Eye size={18} color={C.dim} />
                  : <EyeSlash size={18} color={C.dim} />}
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={s.errorText}>{errors.password}</Text> : null}
          </View>

          <TouchableOpacity onPress={handleForgotPassword} style={s.forgotRow}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[s.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={C.lime} />
              : <Text style={s.primaryBtnText}>Sign In</Text>}
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={s.footer}>
          <Text style={s.footerText}>New to Aria? </Text>
          <TouchableOpacity onPress={onNavigateToRegister}>
            <Text style={s.footerLink}>Create account</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Reset Password Modal */}
      <Modal visible={showResetModal} transparent animationType="fade" onRequestClose={() => setShowResetModal(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Reset Password</Text>
            <Text style={s.modalDesc}>We'll send a reset link to your email address.</Text>
            <View style={[s.inputWrap, { marginBottom: 16 }]}>
              <EnvelopeSimple size={18} color={C.dim} weight="bold" />
              <TextInput
                style={s.input}
                placeholder="your@email.com"
                placeholderTextColor={C.dim}
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowResetModal(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleResetPassword} disabled={resetLoading}>
                <Text style={s.confirmBtnText}>{resetLoading ? 'Sending...' : 'Send Link'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 70 },

  header: { marginBottom: 40 },
  logoBadge: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: C.cardDark, justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  logoLetter: { fontSize: 22, fontFamily: F.bold, color: C.lime },
  greeting: {
    fontSize: 11, fontFamily: F.semi, color: C.dim,
    letterSpacing: 2.5, marginBottom: 6,
  },
  title: {
    fontSize: 30, fontFamily: F.bold, color: C.text,
    lineHeight: 38, letterSpacing: -0.8,
  },

  form: { gap: 18 },
  label: {
    fontSize: 13, fontFamily: F.semi, color: C.text,
    marginBottom: 6, marginLeft: 2,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, height: 52, gap: 10,
  },
  inputFocused: { borderColor: C.accent, backgroundColor: C.accentSoft },
  inputError: { borderColor: C.red },
  input: {
    flex: 1, fontSize: 15, fontFamily: F.medium, color: C.text,
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 12, fontFamily: F.medium, color: C.red,
    marginTop: 4, marginLeft: 2,
  },

  forgotRow: { alignSelf: 'flex-end', marginTop: -6 },
  forgotText: { fontSize: 13, fontFamily: F.semi, color: C.accent },

  primaryBtn: {
    backgroundColor: C.cardDark, borderRadius: 100,
    height: 54, justifyContent: 'center', alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { fontSize: 16, fontFamily: F.bold, color: '#FFF' },

  footer: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 32, paddingBottom: 24,
  },
  footerText: { fontSize: 14, fontFamily: F.regular, color: C.dim },
  footerLink: { fontSize: 14, fontFamily: F.bold, color: C.accent },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modal: {
    backgroundColor: C.card, borderRadius: 20,
    padding: 24, width: '100%', maxWidth: 380,
  },
  modalTitle: { fontSize: 20, fontFamily: F.bold, color: C.text, marginBottom: 6 },
  modalDesc: { fontSize: 14, fontFamily: F.regular, color: C.dim, marginBottom: 18, lineHeight: 20 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 12,
    backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontFamily: F.semi, color: C.dim },
  confirmBtn: {
    flex: 1, height: 46, borderRadius: 12,
    backgroundColor: C.cardDark, justifyContent: 'center', alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontFamily: F.semi, color: '#FFF' },
});
