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
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { User, EnvelopeSimple, Lock, Eye, EyeSlash, CheckCircle } from 'phosphor-react-native';
import { useAuth } from '../contexts/AuthContext';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
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

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin }) => {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string; email?: string; password?: string;
    confirmPassword?: string; consent?: string;
  }>({});
  const [focused, setFocused] = useState('');

  const validateForm = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email is invalid';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!consentGiven) e.consent = 'Please accept the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      if (errors.consent) Alert.alert('Consent Required', errors.consent);
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);
    if (error) {
      let msg = 'An unexpected error occurred';
      if (error.message.includes('already registered') || error.message.includes('already been registered'))
        msg = 'This email is already registered. Please sign in or use password reset.';
      else if (error.message.includes('rate limit'))
        msg = 'Too many attempts. Please try again in a few minutes.';
      else if (error.message.includes('Password'))
        msg = 'Password is too weak. Please use at least 6 characters.';
      else if (error.message.includes('email'))
        msg = 'Please enter a valid email address.';
      else if (error.message) msg = error.message;
      Alert.alert('Registration Failed', msg);
    } else {
      Alert.alert('Account Created!', 'Please check your email to verify your account before signing in.', [{ text: 'OK' }]);
    }
  };

  const renderField = (
    key: string, icon: React.ReactNode, placeholder: string,
    value: string, onChangeText: (t: string) => void,
    opts?: { secure?: boolean; showToggle?: boolean; shown?: boolean; onToggle?: () => void;
      keyboard?: 'email-address'; autoCap?: 'none' | 'words' },
  ) => {
    const err = (errors as any)[key];
    return (
      <View key={key}>
        <View style={[s.inputWrap, focused === key && s.inputFocused, err ? s.inputError : null]}>
          {icon}
          <TextInput
            style={s.input}
            placeholder={placeholder}
            placeholderTextColor={C.dim}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={opts?.secure && !opts?.shown}
            keyboardType={opts?.keyboard}
            autoCapitalize={opts?.autoCap}
            onFocus={() => setFocused(key)}
            onBlur={() => setFocused('')}
          />
          {opts?.showToggle && (
            <TouchableOpacity onPress={opts.onToggle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {opts.shown ? <Eye size={18} color={C.dim} /> : <EyeSlash size={18} color={C.dim} />}
            </TouchableOpacity>
          )}
        </View>
        {err ? <Text style={s.errorText}>{err}</Text> : null}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={s.header}>
          <View style={s.logoBadge}>
            <Text style={s.logoLetter}>A</Text>
          </View>
          <Text style={s.greeting}>GET STARTED</Text>
          <Text style={s.title}>Create your{'\n'}wellness account</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={s.form}>
          {renderField('name', <User size={18} color={focused === 'name' ? C.accent : C.dim} weight="bold" />,
            'Full name', name, setName, { autoCap: 'words' })}

          {renderField('email', <EnvelopeSimple size={18} color={focused === 'email' ? C.accent : C.dim} weight="bold" />,
            'Email address', email, setEmail, { keyboard: 'email-address', autoCap: 'none' })}

          {renderField('password', <Lock size={18} color={focused === 'password' ? C.accent : C.dim} weight="bold" />,
            'Password', password, setPassword,
            { secure: true, showToggle: true, shown: showPassword, onToggle: () => setShowPassword(!showPassword) })}

          {renderField('confirmPassword', <Lock size={18} color={focused === 'confirmPassword' ? C.accent : C.dim} weight="bold" />,
            'Confirm password', confirmPassword, setConfirmPassword,
            { secure: true, showToggle: true, shown: showConfirm, onToggle: () => setShowConfirm(!showConfirm) })}

          {/* Consent */}
          <TouchableOpacity style={s.consentRow} onPress={() => setConsentGiven(!consentGiven)} activeOpacity={0.7}>
            <View style={[s.checkbox, consentGiven && s.checkboxOn]}>
              {consentGiven && <CheckCircle size={16} color="#FFF" weight="fill" />}
            </View>
            <Text style={s.consentText}>I agree to the Terms of Service and Privacy Policy</Text>
          </TouchableOpacity>

          {/* CTA */}
          <TouchableOpacity
            style={[s.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={C.lime} />
              : <Text style={s.primaryBtnText}>Create Account</Text>}
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={onNavigateToLogin}>
            <Text style={s.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 70 },

  header: { marginBottom: 32 },
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

  form: { gap: 14 },
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

  consentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 4, marginBottom: 4,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 7,
    borderWidth: 1.5, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.card,
  },
  checkboxOn: {
    backgroundColor: C.accent, borderColor: C.accent,
  },
  consentText: {
    flex: 1, fontSize: 13, fontFamily: F.regular, color: C.dim,
    lineHeight: 19,
  },

  primaryBtn: {
    backgroundColor: C.cardDark, borderRadius: 100,
    height: 54, justifyContent: 'center', alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: { fontSize: 16, fontFamily: F.bold, color: '#FFF' },

  footer: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 28, paddingBottom: 24,
  },
  footerText: { fontSize: 14, fontFamily: F.regular, color: C.dim },
  footerLink: { fontSize: 14, fontFamily: F.bold, color: C.accent },
});
