import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  ArrowLeft,
  GraduationCap,
  CheckCircle,
  WarningCircle,
  TrendUp,
  ChatCircle,
  Clock,
  Heart,
  Users,
  ShieldCheck,
  Envelope,
  BookOpen,
  Trophy,
  Crown,
  ArrowRight,
  UserCircle,
  Fire,
} from 'phosphor-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/* ── Design tokens ── */
const C = {
  bg: '#FAFAFA', card: '#FFFFFF', cardDark: '#111111',
  accent: '#10B981', accentSoft: '#ECFDF5', lime: '#D4F940',
  warmBg: '#F5F0EB', text: '#1A1A1A', dim: '#8C8C8C',
  border: '#EEEEEE', red: '#EF4444', amber: '#F59E0B',
  blue: '#3B82F6', purple: '#8B5CF6',
};
const F = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
};
const PAD = 20;
const RAD = 20;

interface BecomeCoachScreenProps {
  onNavigate?: (screen: string) => void;
}

export const BecomeCoachScreen: React.FC<BecomeCoachScreenProps> = ({ onNavigate }) => {
  const { user, refreshCoachStatus, switchToCoachMode, canBeCoach } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => { fetchProfile(); }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single();
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile information');
    } finally { setLoading(false); }
  };

  const isProfileComplete = profile && profile.full_name && profile.bio && profile.fitness_level;
  const missingFields: string[] = [];
  if (!profile?.full_name) missingFields.push('Full Name');
  if (!profile?.bio) missingFields.push('Bio/About');
  if (!profile?.fitness_level) missingFields.push('Fitness Level');

  const handleBecomeCoach = async () => {
    if (!isProfileComplete) {
      Alert.alert(
        'Complete Your Profile First',
        `To become a coach, please complete your profile with:\n${missingFields.map(f => `• ${f}`).join('\n')}\n\nGo to your profile to update these fields.`,
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Go to Profile', onPress: () => onNavigate?.('profile') }]
      );
      return;
    }
    if (!user) { Alert.alert('Error', 'You must be logged in to become a coach'); return; }
    setShowConfirmModal(true);
  };

  const confirmBecomeCoach = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      const { data: existingCoach, error: checkError } = await supabase
        .from('coaches').select('*').eq('user_id', user!.id).maybeSingle();
      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existingCoach) {
        if (existingCoach.is_active) {
          if (refreshCoachStatus) await refreshCoachStatus();
          if (switchToCoachMode) await switchToCoachMode();
          if (typeof window !== 'undefined' && window.alert) {
            window.alert('You\'re already a coach! Navigating to your dashboard...');
            onNavigate?.('coach-dashboard');
          } else {
            Alert.alert('Already a Coach!', 'Navigating to your coach dashboard...', [
              { text: 'Go to Dashboard', onPress: () => onNavigate?.('coach-dashboard') }
            ]);
          }
          return;
        }
        const { error: updateError } = await supabase
          .from('coaches').update({ is_active: true }).eq('user_id', user!.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('coaches').insert({
            user_id: user!.id, full_name: profile.full_name,
            email: user!.email || '', specialization: profile.fitness_level,
            bio: profile.bio, is_active: true,
          });
        if (insertError) throw insertError;
      }

      if (switchToCoachMode) await switchToCoachMode();
      onNavigate?.('coach-dashboard');
    } catch (error) {
      console.error('Error becoming coach:', error);
      Alert.alert('Error', 'Failed to become a coach. Please try again.');
    } finally { setSubmitting(false); }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.loadWrap}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={s.loadText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const completedCount = [profile?.full_name, profile?.bio, profile?.fitness_level].filter(Boolean).length;
  const progress = completedCount / 3;
  const RING_R = 38;
  const RING_STROKE = 6;
  const RING_CIRC = 2 * Math.PI * RING_R;

  const requirements = [
    { label: 'Full Name', value: profile?.full_name, display: profile?.full_name || 'Not set' },
    { label: 'Bio / About', value: profile?.bio, display: profile?.bio ? 'Complete' : 'Missing' },
    { label: 'Fitness Level', value: profile?.fitness_level, display: profile?.fitness_level || 'Not set' },
  ];

  const benefits = [
    { Icon: TrendUp, text: 'Track client progress & goals', color: C.accent },
    { Icon: ChatCircle, text: 'Secure messaging platform', color: C.blue },
    { Icon: Clock, text: 'Flexible coaching schedule', color: C.purple },
    { Icon: Heart, text: 'Make a real difference', color: C.red },
    { Icon: Users, text: 'Build meaningful connections', color: C.amber },
  ];

  const responsibilities = [
    { Icon: ShieldCheck, text: 'Provide supportive and professional guidance' },
    { Icon: UserCircle, text: 'Respect client privacy and boundaries' },
    { Icon: Envelope, text: 'Maintain regular communication' },
    { Icon: BookOpen, text: 'Stay updated with best practices' },
    { Icon: Trophy, text: 'Encourage and motivate clients' },
  ];

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400).springify()} style={s.header}>
        <TouchableOpacity onPress={() => onNavigate?.('coach-selection')} style={s.backBtn}>
          <ArrowLeft size={20} color={C.text} weight="bold" />
        </TouchableOpacity>
        <View>
          <Text style={s.headerSub}>Become a</Text>
          <Text style={s.headerTitle}>Health Coach</Text>
        </View>
      </Animated.View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero Card with Progress Ring */}
        <Animated.View entering={FadeInDown.delay(50).duration(500).springify()} style={{ paddingHorizontal: PAD, marginBottom: 20 }}>
          <View style={s.heroCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ position: 'relative', width: 90, height: 90, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={90} height={90} style={{ position: 'absolute' }}>
                  <Circle cx={45} cy={45} r={RING_R} stroke={C.border} strokeWidth={RING_STROKE} fill="none" />
                  <Circle cx={45} cy={45} r={RING_R} stroke={C.accent} strokeWidth={RING_STROKE} fill="none"
                    strokeDasharray={`${progress * RING_CIRC} ${RING_CIRC}`}
                    strokeLinecap="round" rotation="-90" origin="45,45" />
                </Svg>
                <GraduationCap size={30} color={C.accent} weight="duotone" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroLabel}>QUALIFICATION STATUS</Text>
                <Text style={s.heroTitle}>
                  {isProfileComplete ? 'Ready to Go!' : `${completedCount}/3 Complete`}
                </Text>
                <Text style={s.heroDim}>
                  {isProfileComplete
                    ? 'Your profile meets all requirements'
                    : 'Complete your profile to qualify'}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Requirements Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={{ paddingHorizontal: PAD, marginBottom: 20 }}>
          <View style={s.sectionCard}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionIcon, { backgroundColor: isProfileComplete ? C.accentSoft : '#FEF3C7' }]}>
                {isProfileComplete
                  ? <CheckCircle size={20} color={C.accent} weight="fill" />
                  : <WarningCircle size={20} color={C.amber} weight="fill" />}
              </View>
              <Text style={s.sectionTitle}>
                {'Profile ' + (isProfileComplete ? 'Complete' : 'Incomplete')}
              </Text>
            </View>

            <View style={{ gap: 10, marginTop: 14 }}>
              {requirements.map((req, i) => (
                <View key={i} style={s.reqRow}>
                  {req.value
                    ? <CheckCircle size={20} color={C.accent} weight="fill" />
                    : <View style={s.reqCircleEmpty} />}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.reqLabel, req.value && { color: C.text }]}>{req.label}</Text>
                    <Text style={[s.reqValue, req.value ? { color: C.accent } : { color: C.dim }]}>{req.display}</Text>
                  </View>
                </View>
              ))}
            </View>

            {!isProfileComplete && (
              <TouchableOpacity style={s.profileBtn} onPress={() => onNavigate?.('profile')}>
                <Text style={s.profileBtnText}>Complete Profile</Text>
                <ArrowRight size={16} color={C.accent} weight="bold" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Benefits Card */}
        <Animated.View entering={FadeInDown.delay(150).duration(500).springify()} style={{ paddingHorizontal: PAD, marginBottom: 20 }}>
          <View style={s.sectionCard}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionIcon, { backgroundColor: C.accentSoft }]}>
                <Crown size={20} color={C.accent} weight="fill" />
              </View>
              <Text style={s.sectionTitle}>{"What You'll Get"}</Text>
            </View>
            <View style={{ gap: 10, marginTop: 14 }}>
              {benefits.map((b, i) => (
                <View key={i} style={s.benefitRow}>
                  <View style={[s.benefitIcon, { backgroundColor: `${b.color}14` }]}>
                    <b.Icon size={16} color={b.color} weight="fill" />
                  </View>
                  <Text style={s.benefitText}>{b.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Responsibilities Card (dark) */}
        <Animated.View entering={FadeInDown.delay(200).duration(500).springify()} style={{ paddingHorizontal: PAD, marginBottom: 24 }}>
          <View style={s.darkCard}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionIcon, { backgroundColor: 'rgba(212,249,64,0.2)' }]}>
                <ShieldCheck size={20} color={C.lime} weight="fill" />
              </View>
              <Text style={[s.sectionTitle, { color: '#FFF' }]}>Coach Responsibilities</Text>
            </View>
            <View style={{ gap: 10, marginTop: 14 }}>
              {responsibilities.map((r, i) => (
                <View key={i} style={s.respRow}>
                  <View style={s.respDot} />
                  <Text style={s.respText}>{r.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View entering={FadeInDown.delay(250).duration(500).springify()} style={{ paddingHorizontal: PAD }}>
          <TouchableOpacity
            style={[s.ctaBtn, !isProfileComplete && { opacity: 0.5 }]}
            onPress={handleBecomeCoach}
            disabled={!isProfileComplete || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={C.cardDark} />
            ) : (
              <>
                <Fire size={20} color={C.cardDark} weight="fill" />
                <Text style={s.ctaText}>
                  {isProfileComplete ? 'Become a Coach' : 'Complete Profile First'}
                </Text>
                {isProfileComplete && <ArrowRight size={18} color={C.cardDark} weight="bold" />}
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Confirm Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={[s.sectionIcon, { backgroundColor: C.accentSoft, width: 56, height: 56, borderRadius: 28, marginBottom: 14 }]}>
              <GraduationCap size={28} color={C.accent} weight="duotone" />
            </View>
            <Text style={s.modalTitle}>Become a Health Coach</Text>
            <Text style={s.modalMsg}>
              {"This will unlock coach features and allow you to help others with their fitness goals. Ready?"}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowConfirmModal(false)}>
                <Text style={s.modalCancelText}>Not Yet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={confirmBecomeCoach}>
                <Text style={s.modalConfirmText}>{"Let's Go"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* ── Styles ── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadText: { marginTop: 12, fontSize: 14, color: C.dim, fontFamily: F.medium },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD,
    paddingTop: 20, paddingBottom: 12, gap: 14,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
  },
  headerSub: { fontSize: 13, color: C.dim, fontFamily: F.medium },
  headerTitle: { fontSize: 22, color: C.text, fontFamily: F.bold },

  heroCard: {
    backgroundColor: C.warmBg, borderRadius: RAD, padding: 20,
  },
  heroLabel: { fontSize: 11, fontFamily: F.semi, color: C.dim, letterSpacing: 1, marginBottom: 4 },
  heroTitle: { fontSize: 20, fontFamily: F.bold, color: C.text },
  heroDim: { fontSize: 13, fontFamily: F.regular, color: C.dim, marginTop: 2 },

  sectionCard: {
    backgroundColor: C.card, borderRadius: RAD, padding: 20,
    borderWidth: 1, borderColor: C.border,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: 17, fontFamily: F.bold, color: C.text, flex: 1 },

  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqCircleEmpty: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: C.border,
  },
  reqLabel: { fontSize: 14, fontFamily: F.semi, color: C.dim },
  reqValue: { fontSize: 12, fontFamily: F.regular, marginTop: 1 },

  profileBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: C.accentSoft, paddingVertical: 12,
    borderRadius: 14, marginTop: 16,
  },
  profileBtnText: { fontSize: 14, fontFamily: F.semi, color: C.accent },

  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
  },
  benefitText: { fontSize: 14, fontFamily: F.medium, color: C.text, flex: 1 },

  darkCard: {
    backgroundColor: C.cardDark, borderRadius: RAD, padding: 20,
  },
  respRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  respDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: C.lime,
  },
  respText: { fontSize: 14, fontFamily: F.medium, color: 'rgba(255,255,255,0.8)', flex: 1 },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.lime, paddingVertical: 16, borderRadius: 16,
    gap: 8,
  },
  ctaText: { fontSize: 16, fontFamily: F.bold, color: C.cardDark },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: PAD,
  },
  modal: {
    backgroundColor: C.card, borderRadius: RAD, padding: 28,
    width: '100%', maxWidth: 360, alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontFamily: F.bold, color: C.text, marginBottom: 8, textAlign: 'center' },
  modalMsg: { fontSize: 14, fontFamily: F.regular, color: C.dim, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalCancel: {
    flex: 1, paddingVertical: 14, backgroundColor: '#F5F5F5',
    borderRadius: 14, alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontFamily: F.semi, color: C.text },
  modalConfirm: {
    flex: 1, paddingVertical: 14, backgroundColor: C.cardDark,
    borderRadius: 14, alignItems: 'center',
  },
  modalConfirmText: { fontSize: 15, fontFamily: F.semi, color: '#FFF' },
});


