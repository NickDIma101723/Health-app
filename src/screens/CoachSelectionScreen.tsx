import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  StatusBar,
  Dimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowLeft,
  MagnifyingGlass,
  X,
  Star,
  Users,
  Barbell,
  Brain,
  Scales,
  SoccerBall,
  UserCircle,
  ForkKnife,
  ArrowRight,
  ArrowUpRight,
  PaperPlaneTilt,
  ClockCountdown,
  Trophy,
  ShieldCheck,
  Heart,
  Lightning,
  Sparkle,
  Clock,
  CaretRight,
  Crown,
  Leaf,
  GraduationCap,
  Wind,
} from 'phosphor-react-native';
import { useCoaches } from '../hooks';
import { useCoachRequests } from '../hooks/useCoachRequests';

const { width } = Dimensions.get('window');

const C = {
  bg: '#FAFAFA',
  card: '#FFFFFF',
  cardDark: '#111111',
  accent: '#10B981',
  accentDark: '#059669',
  lime: '#D4F940',
  text: '#1A1A1A',
  dim: '#8C8C8C',
  border: '#EEEEEE',
  warmBg: '#F5F0EB',
  red: '#EF4444',
  amber: '#F59E0B',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  teal: '#14B8A6',
  pink: '#EC4899',
  accentSoft: '#ECFDF5',
} as const;

const F = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
} as const;

const PAD = 20;


interface CoachSelectionScreenProps {
  onNavigate?: (screen: string) => void;
  onSelectCoach?: (coachId: string) => void;
}

const SPEC_META: Record<string, { icon: any; color: string; bg: string; darkBg: string }> = {
  'Nutrition':     { icon: ForkKnife,  color: '#F59E0B', bg: '#FEF3C7', darkBg: '#FFF7ED' },
  'Fitness':       { icon: Barbell,    color: '#10B981', bg: '#ECFDF5', darkBg: '#0D3D2E' },
  'Mental Health': { icon: Brain,      color: '#8B5CF6', bg: '#F5F3FF', darkBg: '#2E1065' },
  'Weight Loss':   { icon: Scales,     color: '#EC4899', bg: '#FCE7F3', darkBg: '#831843' },
  'Sports':        { icon: SoccerBall, color: '#3B82F6', bg: '#EFF6FF', darkBg: '#1E3A5F' },
  'General':       { icon: UserCircle, color: '#8C8C8C', bg: '#F5F5F5', darkBg: '#333333' },
};

const getSpecMeta = (spec: string | null) =>
  SPEC_META[spec || ''] || SPEC_META['General'];

export const CoachSelectionScreen: React.FC<CoachSelectionScreenProps> = ({
  onNavigate,
  onSelectCoach,
}) => {
  const { coaches, loading, fetchCoaches } = useCoaches();
  const { sendCoachRequest, hasPendingRequestWith, loadUserRequests } = useCoachRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const [showCoachDetail, setShowCoachDetail] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ visible: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!hasFetchedOnce) {
      fetchCoaches();
      loadUserRequests();
      setHasFetchedOnce(true);
    }
  }, [hasFetchedOnce]);

  const specializations = ['Nutrition', 'Fitness', 'Mental Health', 'Weight Loss', 'Sports', 'General'];
  const activeCoaches = coaches.filter(c => c.is_active);

  const filteredCoaches = coaches.filter(coach => {
    const matchesSearch =
      coach.full_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      (coach.specialization || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    const matchesSpecialization =
      !selectedSpecialization || coach.specialization === selectedSpecialization;
    return matchesSearch && matchesSpecialization && coach.is_active;
  });

  const handleSelectCoach = (coach: any) => {
    setSelectedCoach(coach);
    setShowCoachDetail(true);
  };

  const handleRequestCoach = async (coachId: string, coachName: string) => {
    setShowCoachDetail(false);

    if (hasPendingRequestWith(coachId)) {
      setConfirmModal({
        visible: true,
        title: 'Request Pending',
        message: `You already have a pending request with ${coachName}. Please wait for their response.`,
        onConfirm: () => setConfirmModal(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    setConfirmModal({
      visible: true,
      title: 'Request Coach',
      message: `Send a coaching request to ${coachName}? They will need to accept before you can start working together.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
        setRequesting(coachId);
        try {
          const result = await sendCoachRequest(
            coachId,
            `Hi ${coachName}! I'd love to work with you as my health coach. Looking forward to your guidance!`,
          );
          if (result.error) {
            setConfirmModal({
              visible: true,
              title: 'Error',
              message: result.error,
              onConfirm: () => setConfirmModal(prev => ({ ...prev, visible: false })),
            });
          } else {
            await loadUserRequests();
            setConfirmModal({
              visible: true,
              title: 'Request Sent!',
              message: `Your coaching request has been sent to ${coachName}. You'll be notified when they respond.`,
              onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, visible: false }));
                onNavigate?.('home');
              },
            });
          }
        } catch {
          setConfirmModal({
            visible: true,
            title: 'Error',
            message: 'Failed to send request. Please try again.',
            onConfirm: () => setConfirmModal(prev => ({ ...prev, visible: false })),
          });
        } finally {
          setRequesting(null);
        }
      },
      onCancel: () => setConfirmModal(prev => ({ ...prev, visible: false })),
    });
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <Animated.View entering={FadeInDown.duration(500).springify()}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => onNavigate?.('home')} style={s.backBtn}>
              <ArrowLeft size={20} color={C.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.headerSub}>Find Your</Text>
              <Text style={s.headerTitle}>Health Coach</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── HERO SECTION ── */}
        <Animated.View entering={FadeInDown.delay(40).duration(600).springify()}>
          <View style={s.hero}>
            <View style={s.heroRow}>
              {/* Progress Ring */}
              <View style={s.heroRing}>
                <Svg width={110} height={110}>
                  <Circle cx={55} cy={55} r={46} stroke="rgba(0,0,0,0.06)" strokeWidth={9} fill="none" />
                  <Circle
                    cx={55} cy={55} r={46}
                    stroke={C.accent}
                    strokeWidth={9}
                    fill="none"
                    strokeDasharray={2 * Math.PI * 46}
                    strokeDashoffset={2 * Math.PI * 46 - (2 * Math.PI * 46 * Math.min(100, (activeCoaches.length / 10) * 100)) / 100}
                    strokeLinecap="round"
                    transform="rotate(-90 55 55)"
                  />
                </Svg>
                <View style={s.heroRingCenter}>
                  <GraduationCap size={26} color={C.accent} weight="duotone" />
                </View>
              </View>

              <View style={s.heroInfo}>
                <Text style={s.heroLabel}>AVAILABLE COACHES</Text>
                <Text style={s.heroValue}>
                  {activeCoaches.length}
                  <Text style={s.heroValueUnit}> experts</Text>
                </Text>
                <View style={s.heroPill}>
                  <View style={s.heroPillDot} />
                  <Text style={s.heroPillText}>{specializations.length} specializations</Text>
                </View>
              </View>
            </View>

            {/* Stat strip */}
            <View style={s.heroStrip}>
              <View style={s.heroStripItem}>
                <Text style={s.heroStripVal}>4.9</Text>
                <Text style={s.heroStripLabel}>avg rating</Text>
              </View>
              <View style={s.heroStripDiv} />
              <View style={s.heroStripItem}>
                <Text style={s.heroStripVal}>150+</Text>
                <Text style={s.heroStripLabel}>clients</Text>
              </View>
              <View style={s.heroStripDiv} />
              <View style={s.heroStripItem}>
                <Text style={s.heroStripVal}>5+</Text>
                <Text style={s.heroStripLabel}>years exp</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── SEARCH ── */}
        <Animated.View entering={FadeInDown.delay(80).duration(400).springify()} style={{ paddingHorizontal: PAD, marginBottom: 16 }}>
          <View style={[s.search, searchFocused && s.searchFocused]}>
            <MagnifyingGlass size={17} color={C.dim} />
            <TextInput
              style={s.searchInput}
              placeholder="Search by name or specialty…"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={C.dim}
              selectionColor={C.accent}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <View style={s.searchClear}><X size={11} color={C.dim} weight="bold" /></View>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ── TAB BAR (specialisation filter) ── */}
        <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Browse</Text>
          </View>
          <View style={{ marginHorizontal: -PAD, marginBottom: 16 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 40, paddingRight: 40, gap: 8 }}
            >
              <TouchableOpacity
                style={[s.tabChip, !selectedSpecialization && s.tabChipActive]}
                onPress={() => setSelectedSpecialization(null)}
              >
                <Sparkle size={14} color={!selectedSpecialization ? '#FFF' : C.dim} weight={!selectedSpecialization ? 'fill' : 'regular'} style={{ marginRight: 4 }} />
                <Text style={[s.tabChipText, !selectedSpecialization && s.tabChipTextActive]}>All</Text>
              </TouchableOpacity>
              {specializations.map((spec, idx) => {
                const meta = getSpecMeta(spec);
                const active = selectedSpecialization === spec;
                const SpecIcon = meta.icon;
                return (
                  <TouchableOpacity
                    key={spec}
                    style={[s.tabChip, active && s.tabChipActive]}
                    onPress={() => setSelectedSpecialization(spec === selectedSpecialization ? null : spec)}
                  >
                    <SpecIcon size={14} color={active ? '#FFF' : meta.color} weight={active ? 'fill' : 'regular'} style={{ marginRight: 4 }} />
                    <Text style={[s.tabChipText, active && s.tabChipTextActive]}>{spec}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Animated.View>

        {/* ── COACH LIST (exercise-card style) ── */}
        <View style={{ paddingHorizontal: PAD }}>
          {loading ? (
            <View style={s.loading}>
              <View style={s.loadingPulse}>
                <ActivityIndicator size="large" color={C.accent} />
              </View>
              <Text style={s.loadingText}>Finding coaches…</Text>
            </View>
          ) : filteredCoaches.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyCircle}>
                <MagnifyingGlass size={30} color={C.dim} />
              </View>
              <Text style={s.emptyTitle}>No coaches found</Text>
              <Text style={s.emptyText}>
                {searchQuery ? 'Try adjusting your search' : 'No coaches available for this category'}
              </Text>
            </View>
          ) : (
            filteredCoaches.map((coach, index) => {
              const meta = getSpecMeta(coach.specialization);
              const SpecIcon = meta.icon;
              const isPending = hasPendingRequestWith(coach.id);
              const isRequesting = requesting === coach.id;
              // Alternate card backgrounds like MindfulnessScreen exercises
              const isDark = index % 4 === 2;
              const isWarm = index % 4 === 1;
              const cardBg = isDark ? C.cardDark : isWarm ? meta.bg : C.card;
              const textCol = isDark ? '#FFF' : C.text;
              const dimCol = isDark ? 'rgba(255,255,255,0.5)' : C.dim;
              const borderCol = isDark || isWarm ? 'transparent' : C.border;

              return (
                <Animated.View key={coach.id} entering={FadeInDown.delay(180 + index * 50).duration(400).springify()}>
                  <TouchableOpacity
                    style={[s.coachCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                    onPress={() => handleSelectCoach(coach)}
                    disabled={isRequesting}
                    activeOpacity={0.85}
                  >
                    {/* Icon */}
                    <View style={[s.coachIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : `${meta.color}18` }]}>
                      <SpecIcon size={22} color={isDark ? meta.bg : meta.color} weight="duotone" />
                    </View>

                    {/* Info */}
                    <View style={s.coachInfo}>
                      <Text style={[s.coachName, { color: textCol }]}>{coach.full_name}</Text>
                      <Text style={[s.coachDesc, { color: dimCol }]}>
                        {coach.bio || `${coach.specialization || 'General'} specialist`}
                      </Text>
                      <View style={s.coachMeta}>
                        <View style={[s.pill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                          <Clock size={11} color={dimCol} />
                          <Text style={[s.pillText, { color: dimCol }]}>{coach.specialization || 'General'}</Text>
                        </View>
                        <View style={[s.pill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                          <Star size={11} color={isDark ? C.lime : C.amber} weight="fill" />
                          <Text style={[s.pillText, { color: dimCol }]}>4.9</Text>
                        </View>
                      </View>
                    </View>

                    {/* Action */}
                    {isRequesting ? (
                      <ActivityIndicator size="small" color={isDark ? C.lime : C.accent} />
                    ) : isPending ? (
                      <View style={[s.pendingBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FEF3C7' }]}>
                        <ClockCountdown size={14} color={isDark ? C.lime : C.amber} weight="fill" />
                      </View>
                    ) : (
                      <View style={[s.goBtn, { backgroundColor: isDark ? C.lime : meta.color }]}>
                        <ArrowUpRight size={16} color={isDark ? C.text : '#FFF'} weight="bold" />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </View>

        {/* ── BECOME A COACH ── */}
        <Animated.View entering={FadeInDown.delay(400).duration(500).springify()} style={{ paddingHorizontal: PAD, marginTop: 20 }}>
          <View style={s.ctaCard}>
            <View style={s.ctaRow}>
              <View style={s.ctaIconBg}>
                <Crown size={26} color={C.text} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.ctaTitle}>Become a Coach</Text>
                <Text style={s.ctaDesc}>Share your expertise and help others reach their goals</Text>
              </View>
            </View>
            <TouchableOpacity style={s.ctaBtn} onPress={() => onNavigate?.('become-coach')} activeOpacity={0.8}>
              <Text style={s.ctaBtnText}>Get Started</Text>
              <ArrowRight size={16} color={C.text} weight="bold" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── COACH DETAIL MODAL ── */}
      <Modal visible={showCoachDetail} animationType="slide" transparent onRequestClose={() => setShowCoachDetail(false)}>
        <View style={s.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowCoachDetail(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <TouchableOpacity style={s.sheetClose} onPress={() => setShowCoachDetail(false)}>
              <X size={18} color={C.dim} weight="bold" />
            </TouchableOpacity>

            {selectedCoach && (() => {
              const meta = getSpecMeta(selectedCoach.specialization);
              const SpecIcon = meta.icon;
              const isPending = hasPendingRequestWith(selectedCoach.id);
              return (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  {/* avatar + name */}
                  <View style={s.sheetTop}>
                    <View style={[s.sheetAvatar, { backgroundColor: meta.bg }]}>
                      <SpecIcon size={40} color={meta.color} weight="duotone" />
                    </View>
                    <Text style={s.sheetName}>{selectedCoach.full_name}</Text>
                    <View style={[s.sheetSpecBadge, { backgroundColor: meta.bg }]}>
                      <Star size={13} color={meta.color} weight="fill" />
                      <Text style={[s.sheetSpecText, { color: meta.color }]}>
                        {selectedCoach.specialization || 'General'} Specialist
                      </Text>
                    </View>
                  </View>

                  {/* Stat cards */}
                  <View style={s.sheetStats}>
                    <View style={[s.sheetStatCard, { backgroundColor: C.accentSoft }]}>
                      <Star size={18} color={C.accent} weight="fill" />
                      <Text style={s.sheetStatVal}>4.9</Text>
                      <Text style={s.sheetStatLabel}>Rating</Text>
                    </View>
                    <View style={[s.sheetStatCard, { backgroundColor: '#FEF3C7' }]}>
                      <Users size={18} color={C.amber} weight="fill" />
                      <Text style={s.sheetStatVal}>150+</Text>
                      <Text style={s.sheetStatLabel}>Clients</Text>
                    </View>
                    <View style={[s.sheetStatCard, { backgroundColor: '#EFF6FF' }]}>
                      <Trophy size={18} color={C.blue} weight="fill" />
                      <Text style={s.sheetStatVal}>5+</Text>
                      <Text style={s.sheetStatLabel}>Years</Text>
                    </View>
                  </View>

                  {/* Bio */}
                  {selectedCoach.bio && (
                    <View style={s.sheetBioCard}>
                      <Text style={s.sheetBioTitle}>About</Text>
                      <Text style={s.sheetBio}>{selectedCoach.bio}</Text>
                    </View>
                  )}

                  {/* Features */}
                  <View style={s.sheetFeatures}>
                    {[
                      { icon: <ShieldCheck size={18} color={C.accent} weight="fill" />, label: 'Verified Coach', bg: C.accentSoft },
                      { icon: <Heart size={18} color={C.red} weight="fill" />, label: 'Personalized Plans', bg: '#FEE2E2' },
                      { icon: <Lightning size={18} color={C.amber} weight="fill" />, label: 'Fast Responses', bg: '#FEF3C7' },
                    ].map((f, i) => (
                      <View key={i} style={[s.sheetFeatureRow, { backgroundColor: f.bg }]}>
                        {f.icon}
                        <Text style={s.sheetFeatureText}>{f.label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* CTA */}
                  <TouchableOpacity
                    style={[s.sheetCta, isPending && { backgroundColor: C.warmBg }]}
                    onPress={() => handleRequestCoach(selectedCoach.id, selectedCoach.full_name)}
                    activeOpacity={0.8}
                  >
                    {isPending ? (
                      <>
                        <ClockCountdown size={20} color={C.amber} weight="fill" />
                        <Text style={[s.sheetCtaText, { color: C.amber }]}>Request Pending</Text>
                      </>
                    ) : (
                      <>
                        <PaperPlaneTilt size={20} color="#FFF" weight="fill" />
                        <Text style={s.sheetCtaText}>Send Request</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── CONFIRM MODAL ── */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (confirmModal.onCancel) confirmModal.onCancel();
          else setConfirmModal(prev => ({ ...prev, visible: false }));
        }}
      >
        <View style={s.confirmOverlay}>
          <View style={s.confirmCard}>
            <Text style={s.confirmTitle}>{confirmModal.title}</Text>
            <Text style={s.confirmMsg}>{confirmModal.message}</Text>
            <View style={s.confirmBtns}>
              {confirmModal.onCancel && (
                <TouchableOpacity style={s.confirmCancel} onPress={confirmModal.onCancel}>
                  <Text style={s.confirmCancelText}>
                    {confirmModal.title === 'Success!' ? 'Stay Here' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.confirmOk} onPress={confirmModal.onConfirm}>
                <Text style={s.confirmOkText}>
                  {confirmModal.title === 'Success!' ? 'Open Chat' : confirmModal.onCancel ? 'Send' : 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* ─────────── STYLES ─────────── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingTop: 20, paddingBottom: 8 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  headerSub: { fontFamily: F.medium, fontSize: 13, color: C.dim, marginBottom: 2 },
  headerTitle: { fontFamily: F.bold, fontSize: 22, color: C.text, letterSpacing: -0.5 },

  // Hero — warm card with ring (like MindfulnessScreen hero)
  hero: { backgroundColor: C.warmBg, marginHorizontal: PAD, borderRadius: 28, padding: 24, marginBottom: 20, marginTop: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  heroRing: { position: 'relative' as const },
  heroRingCenter: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  heroInfo: { flex: 1, marginLeft: 22 },
  heroLabel: { fontFamily: F.medium, fontSize: 11, color: C.dim, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 2 },
  heroValue: { fontFamily: F.bold, fontSize: 28, color: C.text, letterSpacing: -0.5, marginBottom: 10 },
  heroValueUnit: { fontFamily: F.regular, fontSize: 16, color: C.dim },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(16,185,129,0.14)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, alignSelf: 'flex-start' as const,
  },
  heroPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
  heroPillText: { fontFamily: F.semi, fontSize: 12, color: C.accent },
  heroStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 8,
  },
  heroStripItem: { alignItems: 'center', gap: 3 },
  heroStripVal: { fontFamily: F.bold, fontSize: 16, color: C.text },
  heroStripLabel: { fontFamily: F.medium, fontSize: 11, color: C.dim },
  heroStripDiv: { width: 1, height: 28, backgroundColor: 'rgba(0,0,0,0.08)' },

  // Search
  search: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: 16, borderWidth: 1.5, borderColor: C.border, gap: 10,
  },
  searchFocused: { borderColor: C.accent },
  searchInput: { flex: 1, fontSize: 14, fontFamily: F.medium, color: C.text, padding: 0 },
  searchClear: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.border, justifyContent: 'center', alignItems: 'center' },

  // Section headers
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: PAD, marginBottom: 14 },
  sectionTitle: { fontFamily: F.bold, fontSize: 20, color: C.text, letterSpacing: -0.5 },
  // Tab chips
  tabChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 11, borderRadius: 24,
    backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#D4D4D4',
  },
  tabChipActive: { backgroundColor: C.cardDark, borderColor: C.cardDark },
  tabChipText: { fontFamily: F.medium, fontSize: 13, color: '#333' },
  tabChipTextActive: { color: '#FFF', fontFamily: F.semi },

  // Coach cards (exercise-card style, like MindfulnessScreen)
  coachCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 24, padding: 16, marginBottom: 10,
    borderWidth: 1, gap: 14,
  },
  coachIcon: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  coachInfo: { flex: 1, gap: 3 },
  coachName: { fontFamily: F.bold, fontSize: 16, letterSpacing: -0.3 },
  coachDesc: { fontFamily: F.regular, fontSize: 12, lineHeight: 17 },
  coachMeta: { flexDirection: 'row', gap: 6, marginTop: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontFamily: F.medium, fontSize: 11 },
  goBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  pendingBadge: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },

  // Empty / Loading
  loading: { justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingPulse: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.accentSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  loadingText: { fontFamily: F.medium, fontSize: 14, color: C.dim },
  empty: { justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: F.bold, fontSize: 17, color: C.text, marginBottom: 6 },
  emptyText: { fontFamily: F.regular, fontSize: 13, color: C.dim, textAlign: 'center', paddingHorizontal: 32 },

  // Become-a-Coach CTA
  ctaCard: { backgroundColor: C.cardDark, borderRadius: 24, padding: 24 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 },
  ctaIconBg: { width: 52, height: 52, borderRadius: 18, backgroundColor: C.lime, justifyContent: 'center', alignItems: 'center' },
  ctaTitle: { fontFamily: F.bold, fontSize: 18, color: '#FFF', letterSpacing: -0.3, marginBottom: 4 },
  ctaDesc: { fontFamily: F.regular, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.lime, paddingVertical: 14, borderRadius: 20,
  },
  ctaBtnText: { fontFamily: F.semi, fontSize: 15, color: C.text },

  // ── Detail Sheet (bottom sheet style) ──
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingBottom: 30, maxHeight: '85%',
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginTop: 12, marginBottom: 8 },
  sheetClose: { alignSelf: 'flex-end', padding: 8 },

  sheetTop: { alignItems: 'center', marginBottom: 20 },
  sheetAvatar: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  sheetName: { fontFamily: F.bold, fontSize: 22, color: C.text, letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
  sheetSpecBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18 },
  sheetSpecText: { fontFamily: F.semi, fontSize: 13 },

  sheetStats: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  sheetStatCard: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 20, gap: 6 },
  sheetStatVal: { fontFamily: F.bold, fontSize: 18, color: C.text },
  sheetStatLabel: { fontFamily: F.medium, fontSize: 11, color: C.dim },

  sheetBioCard: { backgroundColor: C.bg, borderRadius: 20, padding: 20, marginBottom: 20 },
  sheetBioTitle: { fontFamily: F.bold, fontSize: 15, color: C.text, marginBottom: 8 },
  sheetBio: { fontFamily: F.regular, fontSize: 14, color: C.dim, lineHeight: 22 },

  sheetFeatures: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  sheetFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  sheetFeatureText: { fontFamily: F.medium, fontSize: 12, color: C.text },

  sheetCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.cardDark, paddingVertical: 16, borderRadius: 20,
  },
  sheetCtaText: { fontFamily: F.semi, fontSize: 16, color: '#FFF' },

  // Confirm modal
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmCard: { backgroundColor: C.card, borderRadius: 24, padding: 28, width: '100%', maxWidth: 400 },
  confirmTitle: { fontFamily: F.bold, fontSize: 20, color: C.text, marginBottom: 12, textAlign: 'center' },
  confirmMsg: { fontFamily: F.regular, fontSize: 14, color: C.dim, marginBottom: 24, textAlign: 'center', lineHeight: 22 },
  confirmBtns: { flexDirection: 'row', gap: 12 },
  confirmCancel: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  confirmOk: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: C.accent },
  confirmCancelText: { fontFamily: F.semi, fontSize: 15, color: C.text },
  confirmOkText: { fontFamily: F.semi, fontSize: 15, color: '#FFF' },
});
