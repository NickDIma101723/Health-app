import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
  ImageBackground,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing as REasing,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, ArrowUpRight, ArrowRight, Scales, Flame, ForkKnife, Check, X, ChatCircle, Heartbeat } from 'phosphor-react-native';
import Svg, { Path, Circle as SvgCircle, Rect, Line, Defs, Pattern, ClipPath, G } from 'react-native-svg';
import { XStack, YStack, Card, Text as TText } from 'tamagui';
import { BlurView } from 'expo-blur';
import { useAuth } from '../contexts/AuthContext';
import { BottomNavigation } from '../components';
import { PlatformPressable } from '../components/AnimatedPressable';
import { useHealthMetrics, useUserGoals, useNotifications, useNutritionAdapter, useScheduleAdapter } from '../hooks';
import { supabase } from '../lib/supabase';
import { MiniMap } from '../components/MiniMap';
import { T } from '../tamagui.config';

const { width, height } = Dimensions.get('window');

const C = {
  bg:         '#FAFAFA',
  card:       '#FFFFFF',
  cardDark:   '#111111',
  accent:     '#10B981',
  accentDark: '#059669',
  green:      '#10B981',
  greenDark:  '#047857',
  heartRed:   '#EF4444',
  text:       '#1A1A1A',
  dim:        '#8C8C8C',
  white:      '#FFFFFF',
  separator:  '#EEEEEE',
  lime:       '#D4F940',
};

const F = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
} as const;

const PAD = 16;
const GAP = 16;
const SCROLL_CARD_W = 230;
const SCROLL_CARD_H = 235;

const FILTER_CHIPS = ['All', 'Meditation', 'Sports', 'Mindfulness', 'Cardio'] as const;

// ── SVG progress bar with hatched track ──
const SvgProgressBar = ({ width: barW, height: barH, pct, trackColor, fillColor }: { width: number; height: number; pct: number; trackColor: string; fillColor: string }) => {
  const r = barH / 2;
  const fillW = Math.max(barH, (pct / 100) * barW);
  const gap = 5;          // spacing between hatch lines
  const sw = 2.4;         // hatch stroke width
  return (
    <Svg width={barW} height={barH}>
      <Defs>
        <Pattern id="hatch" width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Line x1={0} y1={0} x2={0} y2={gap} stroke={trackColor} strokeWidth={sw} />
        </Pattern>
        <ClipPath id="trackClip">
          <Rect x={0} y={0} width={barW} height={barH} rx={r} ry={r} />
        </ClipPath>
      </Defs>
      {/* solid background behind hatch for more contrast */}
      <Rect x={0} y={0} width={barW} height={barH} rx={r} ry={r} fill={trackColor} opacity={0.35} />
      {/* hatched track */}
      <G clipPath="url(#trackClip)">
        <Rect x={0} y={0} width={barW} height={barH} fill="url(#hatch)" />
      </G>
      {/* filled portion */}
      <Rect x={0} y={0} width={fillW} height={barH} rx={r} ry={r} fill={fillColor} />
    </Svg>
  );
};

// ── Frosted glass button ──
const GlassButton = ({ label, dark = false }: { label: string; dark?: boolean }) => (
  <YStack borderRadius={19} overflow="hidden">
    <BlurView intensity={40} tint={dark ? 'light' : 'dark'} style={{ paddingHorizontal: 17, paddingVertical: 9 }}>
      <TText style={{ fontFamily: F.semi, fontSize: 13, color: dark ? '#FFF' : C.text }}>{label}</TText>
    </BlurView>
  </YStack>
);

interface HomeScreenProps {
  onNavigate?: (screen: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { metrics } = useHealthMetrics();
  const { goals } = useUserGoals();
  const { getDailyNutrition } = useNutritionAdapter();
  const { getActivitiesForDate } = useScheduleAdapter();
  const { notifications, markAsRead, refresh: fetchNotifications, loading: notificationsLoading } = useNotifications();

  const [showNotifications, setShowNotifications] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const unreadCount = notifications.filter(n => !n.is_read).length;
  useEffect(() => { if (showNotifications) fetchNotifications(); }, [showNotifications]);

  const today = new Date().toISOString().split('T')[0];
  const todayNutrition = getDailyNutrition(today);
  const todayActivities = getActivitiesForDate(today);

  const pulseScale = useSharedValue(1);
  const breatheOpacity = useSharedValue(0.6);
  const [profileName, setProfileName] = useState<string>('ATHLETE');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  const breatheStyle = useAnimatedStyle(() => ({
    opacity: breatheOpacity.value,
  }));

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 200, easing: REasing.out(REasing.quad) }),
        withTiming(1, { duration: 150 }),
        withTiming(1.15, { duration: 150, easing: REasing.out(REasing.quad) }),
        withTiming(1, { duration: 200 }),
        withDelay(900, withTiming(1, { duration: 0 })),
      ),
      -1,
      false,
    );
    breatheOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: REasing.inOut(REasing.sin) }),
        withTiming(0.6, { duration: 1800, easing: REasing.inOut(REasing.sin) }),
      ),
      -1,
      false,
    );

    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('user_id', user.id).single();
      if (data?.full_name) setProfileName(data.full_name.toUpperCase());
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    };
    fetchProfile();
  }, [user]);

  const steps = metrics?.steps || 0;
  const stepGoal = goals?.steps_daily || 10000;
  const heartRate = 124;
  const weight = 72.2;
  const weightTrend = [72.8, 72.5, 72.6, 72.3, 72.1, 72.4, 72.2];
  const streakDays = [true, true, true, false, false, false, false];
  const streakLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const hrBars = [35, 55, 45, 80, 60, 90, 50, 75, 42, 68];
  const calBurned = 1380;
  const calGoal = 2100;
  const calPct = Math.round((calBurned / calGoal) * 100);

  const formatName = (raw: string) => {
    return raw.split(' ').map(w => w[0] + w.substring(1).toLowerCase()).join(' ');
  };

  return (
    <YStack flex={1} backgroundColor={C.bg}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1, paddingTop: 10 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: PAD, paddingTop: 12 }} showsVerticalScrollIndicator={false}>

          {/* ── HEADER ── */}
          <Animated.View entering={FadeInDown.duration(600).springify()}>
            <XStack justifyContent="space-between" alignItems="center">
              <PlatformPressable onPress={() => onNavigate?.('profile')} style={{ borderRadius: 24 }}>
                {avatarUrl ? (
                  <ImageBackground source={{ uri: avatarUrl }} style={st.avatar} imageStyle={{ borderRadius: 24 }} />
                ) : (
                  <YStack width={48} height={48} borderRadius={24} backgroundColor={C.cardDark} alignItems="center" justifyContent="center">
                    <TText style={{ color: '#FFF', fontFamily: F.bold, fontSize: 18 }}>{profileName.charAt(0)}</TText>
                  </YStack>
                )}
              </PlatformPressable>
              <PlatformPressable style={st.iconBtn} onPress={() => setShowNotifications(true)}>
                <Bell size={21} color={C.text} />
                {unreadCount > 0 && <YStack position="absolute" top={10} right={10} width={8} height={8} borderRadius={4} backgroundColor="#EF4444" borderWidth={2} borderColor="#FFF" />}
              </PlatformPressable>
            </XStack>

            <YStack marginTop={14} marginBottom={16}>
              <TText style={{ fontFamily: F.regular, fontSize: 14, color: C.dim }}>{greeting}</TText>
              <TText style={{ fontFamily: F.bold, fontSize: 28, color: C.text, letterSpacing: -0.8, marginTop: 2 }}>
                {formatName(profileName)}
              </TText>
            </YStack>
          </Animated.View>

          {/* ── WORKOUT PROGRESS ── */}
          <Animated.View entering={FadeInDown.delay(80).duration(500).springify()} style={{ marginBottom: GAP }}>
            <Card borderRadius={16} overflow="hidden" padding={0} backgroundColor={C.cardDark}>
              <XStack padding={14} alignItems="center">
                <YStack flex={1} gap={3}>
                  <TText style={{ fontFamily: F.medium, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Workout Progress</TText>
                  <TText style={{ fontFamily: F.regular, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    {Math.round(calBurned / 138)}h of 20h this week
                  </TText>
                </YStack>
                <Svg width={52} height={52} viewBox="0 0 52 52">
                  <SvgCircle cx={26} cy={26} r={22} stroke="rgba(255,255,255,0.06)" strokeWidth={4} fill="none" />
                  <SvgCircle cx={26} cy={26} r={22} stroke={C.accent} strokeWidth={4} fill="none"
                    strokeDasharray={`${(calPct / 100) * 138} 138`}
                    strokeLinecap="round" transform="rotate(-90 26 26)" />
                </Svg>
              </XStack>
            </Card>
          </Animated.View>

          {/* ── HEART RATE ── */}
          <Animated.View entering={FadeInDown.delay(160).duration(500).springify()} style={{ marginBottom: GAP }}>
            <Card borderRadius={16} overflow="hidden" padding={0} backgroundColor={C.cardDark}>
              <YStack padding={14}>
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack alignItems="center" gap={8}>
                    <Animated.View style={[{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' }, pulseStyle]}>
                      <Heartbeat size={15} color="#EF4444" weight="fill" />
                    </Animated.View>
                    <TText style={{ fontFamily: F.regular, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Heart Rate</TText>
                  </XStack>
                  <Animated.View style={breatheStyle}>
                    <YStack width={7} height={7} borderRadius={4} backgroundColor={C.heartRed} />
                  </Animated.View>
                </XStack>

                <TText style={{ fontFamily: F.bold, fontSize: 40, color: '#FFF', letterSpacing: -2, marginTop: 6 }}>
                  {heartRate} <TText style={{ fontSize: 14, fontFamily: F.regular, color: 'rgba(255,255,255,0.3)' }}>bpm</TText>
                </TText>

                <XStack alignItems="flex-end" gap={4} height={48} marginTop={8}>
                  {hrBars.map((h, i) => (
                    <YStack key={i} flex={1} height={`${h}%`} borderRadius={4}
                      backgroundColor={i === hrBars.length - 1 ? C.heartRed : 'rgba(239,68,68,0.15)'} />
                  ))}
                </XStack>

                <XStack marginTop={6} justifyContent="space-between">
                  <TText style={{ fontFamily: F.regular, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Resting 62</TText>
                  <TText style={{ fontFamily: F.regular, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Range 56–172</TText>
                </XStack>
              </YStack>
            </Card>
          </Animated.View>

          {/* ── ACTIVITY MAP ── */}
          <Animated.View entering={FadeInDown.delay(240).duration(500).springify()} style={{ marginBottom: GAP }}>
            <PlatformPressable onPress={() => onNavigate?.('activity-map')} style={{ borderRadius: 16, overflow: 'hidden' }}>
              <Card borderRadius={16} overflow="hidden" height={170} padding={0}>
                <MiniMap />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, paddingHorizontal: 16, paddingBottom: 14, justifyContent: 'flex-end' }}
                >
                  <XStack justifyContent="space-between" alignItems="flex-end">
                    <YStack>
                      <TText style={{ fontFamily: F.medium, color: '#FFF', fontSize: 15 }}>Morning Run</TText>
                      <TText style={{ fontFamily: F.regular, color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>5.2 km · 45 min</TText>
                    </YStack>
                    <ArrowUpRight size={20} color="#FFF" weight="bold" />
                  </XStack>
                </LinearGradient>
              </Card>
            </PlatformPressable>
          </Animated.View>

          {/* ── FILTER CHIPS ── */}
          <Animated.View entering={FadeInDown.delay(320).duration(500).springify()} style={{ marginBottom: 16, marginHorizontal: -PAD }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PAD }}>
              {FILTER_CHIPS.map((chip, idx) => (
                <PlatformPressable key={chip} onPress={() => setActiveFilter(chip)} style={{
                  paddingHorizontal: 22, paddingVertical: 12, borderRadius: 26,
                  backgroundColor: activeFilter === chip ? C.cardDark : '#F5F5F5',
                  borderWidth: activeFilter === chip ? 0 : 1,
                  borderColor: '#D4D4D4',
                  marginRight: idx === FILTER_CHIPS.length - 1 ? 0 : 3,
                }}>
                  <TText style={{ fontFamily: activeFilter === chip ? F.semi : F.medium, fontSize: 14, color: activeFilter === chip ? '#FFF' : '#333' }}>{chip}</TText>
                </PlatformPressable>
              ))}
            </ScrollView>
          </Animated.View>

          {/* ── HORIZONTAL CARDS ── */}
          <Animated.View entering={FadeInDown.delay(400).duration(500).springify()} style={{ marginHorizontal: -PAD }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 120 }}
            >
              {/* Running */}
              <YStack width={SCROLL_CARD_W} height={SCROLL_CARD_H} marginRight={8} borderRadius={32} backgroundColor={C.lime}
                paddingHorizontal={13} paddingTop={14} paddingBottom={13} style={{ borderCurve: 'continuous' } as any} overflow="hidden"
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <TText style={{ fontFamily: F.bold, fontSize: 17, color: C.text }}>Running</TText>
                  <YStack width={37} height={37} borderRadius={19} backgroundColor="rgba(0,0,0,0.75)" alignItems="center" justifyContent="center">
                    <ArrowUpRight size={18} color="#FFF" weight="bold" />
                  </YStack>
                </XStack>
                <TText style={{ fontFamily: F.medium, fontSize: 13, color: 'rgba(0,0,0,0.45)', marginTop: 5 }}>Your progress</TText>
                <TText style={{ fontFamily: F.bold, fontSize: 37, color: C.text, letterSpacing: -1, marginTop: 3 }}>
                  80<TText style={{ fontSize: 21, fontFamily: F.semi }}>%</TText>
                </TText>
                <YStack marginTop={9}>
                  <SvgProgressBar width={SCROLL_CARD_W - 36} height={22} pct={80} trackColor="rgba(0,0,0,0.18)" fillColor={C.cardDark} />
                </YStack>
                <XStack marginTop={13} alignItems="center" gap={8}>
                  <YStack borderRadius={19} backgroundColor="#FFF" paddingHorizontal={17} paddingVertical={9}>
                    <TText style={{ fontFamily: F.semi, fontSize: 13, color: C.text }}>Continue</TText>
                  </YStack>
                  <XStack>
                    <YStack width={33} height={33} borderRadius={17} backgroundColor="#DDD" borderWidth={2} borderColor={C.lime} />
                    <YStack width={33} height={33} borderRadius={17} backgroundColor="#CCC" borderWidth={2} borderColor={C.lime} marginLeft={-10} />
                  </XStack>
                </XStack>
              </YStack>

              {/* Weight */}
              <YStack width={SCROLL_CARD_W} height={SCROLL_CARD_H} marginRight={8} borderRadius={32} backgroundColor="#0D3D2E"
                paddingHorizontal={13} paddingTop={14} paddingBottom={13} style={{ borderCurve: 'continuous' } as any} overflow="hidden"
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <TText style={{ fontFamily: F.bold, fontSize: 17, color: '#FFF' }}>Weight</TText>
                  <YStack width={37} height={37} borderRadius={19} backgroundColor="rgba(255,255,255,0.12)" alignItems="center" justifyContent="center">
                    <Scales size={15} color="#6EE7B7" />
                  </YStack>
                </XStack>
                <TText style={{ fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 5 }}>Your progress</TText>
                <TText style={{ fontFamily: F.bold, fontSize: 37, color: '#FFF', letterSpacing: -1, marginTop: 3 }}>
                  {weight}<TText style={{ fontSize: 15, fontFamily: F.regular, color: 'rgba(255,255,255,0.35)' }}> kg</TText>
                </TText>
                <XStack alignItems="flex-end" gap={6} height={48} marginTop={26}>
                  {weightTrend.map((w, i) => {
                    const minW = Math.min(...weightTrend);
                    const maxW = Math.max(...weightTrend);
                    const range = maxW - minW || 1;
                    const h = ((w - minW) / range) * 36 + 12;
                    return (
                      <YStack key={i} flex={1} height={h} borderRadius={6}
                        backgroundColor={i === weightTrend.length - 1 ? '#6EE7B7' : 'rgba(110,231,183,0.15)'} />
                    );
                  })}
                </XStack>
              </YStack>

              {/* Streak */}
              <YStack width={SCROLL_CARD_W} height={SCROLL_CARD_H} marginRight={8} borderRadius={32} backgroundColor={C.cardDark}
                paddingHorizontal={13} paddingTop={14} paddingBottom={13} style={{ borderCurve: 'continuous' } as any} overflow="hidden"
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <TText style={{ fontFamily: F.bold, fontSize: 17, color: '#FFF' }}>Gym Streak</TText>
                  <YStack width={37} height={37} borderRadius={19} backgroundColor="rgba(255,255,255,0.1)" alignItems="center" justifyContent="center">
                    <Flame size={15} color="#F59E0B" weight="fill" />
                  </YStack>
                </XStack>
                <TText style={{ fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 5 }}>This week</TText>
                <TText style={{ fontFamily: F.bold, fontSize: 37, color: '#FFF', letterSpacing: -1, marginTop: 3 }}>
                  3<TText style={{ fontSize: 19, fontFamily: F.regular, color: 'rgba(255,255,255,0.2)' }}>/7</TText>
                </TText>
                <XStack gap={6} marginTop={26}>
                  {streakLabels.map((l, i) => (
                    <YStack key={i} alignItems="center" gap={3}>
                      <TText style={{ fontFamily: F.regular, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{l}</TText>
                      <YStack width={22} height={22} borderRadius={11}
                        backgroundColor={streakDays[i] ? '#F59E0B' : 'rgba(255,255,255,0.04)'}
                        alignItems="center" justifyContent="center"
                      >
                        {streakDays[i] && <Check size={10} color="#000" weight="bold" />}
                      </YStack>
                    </YStack>
                  ))}
                </XStack>
              </YStack>

              {/* Calories */}
              <YStack width={SCROLL_CARD_W} height={SCROLL_CARD_H} marginRight={8} borderRadius={32} backgroundColor="#FFF7ED"
                paddingHorizontal={13} paddingTop={14} paddingBottom={13} style={{ borderCurve: 'continuous' } as any} overflow="hidden"
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <TText style={{ fontFamily: F.bold, fontSize: 17, color: C.text }}>Calories</TText>
                  <YStack width={37} height={37} borderRadius={19} backgroundColor="rgba(234,88,12,0.12)" alignItems="center" justifyContent="center">
                    <ForkKnife size={15} color="#EA580C" />
                  </YStack>
                </XStack>
                <TText style={{ fontFamily: F.medium, fontSize: 13, color: 'rgba(0,0,0,0.45)', marginTop: 5 }}>Your progress</TText>
                <TText style={{ fontFamily: F.bold, fontSize: 37, color: C.text, letterSpacing: -1, marginTop: 3 }}>
                  {calBurned}<TText style={{ fontSize: 13, fontFamily: F.regular, color: C.dim }}> kcal</TText>
                </TText>
                <YStack marginTop={9}>
                  <SvgProgressBar width={SCROLL_CARD_W - 36} height={22} pct={calPct} trackColor="rgba(234,88,12,0.25)" fillColor="#EA580C" />
                </YStack>
                <XStack marginTop={13} alignItems="center">
                  <YStack borderRadius={19} backgroundColor="#EA580C" paddingHorizontal={17} paddingVertical={9}>
                    <TText style={{ fontFamily: F.semi, fontSize: 13, color: '#FFF' }}>Continue</TText>
                  </YStack>
                </XStack>
              </YStack>
            </ScrollView>
          </Animated.View>

          {/* ── NOTIFICATIONS MODAL ── */}
          <Modal visible={showNotifications} animationType="slide" transparent onRequestClose={() => setShowNotifications(false)}>
            <YStack flex={1} backgroundColor="rgba(0,0,0,0.4)" justifyContent="flex-end">
              <YStack backgroundColor="#FFF" borderTopLeftRadius={28} borderTopRightRadius={28} height={height * 0.65} padding={24}>
                <XStack justifyContent="space-between" alignItems="center" marginBottom={20}>
                  <TText style={{ fontFamily: F.bold, fontSize: 18, color: C.text }}>Notifications</TText>
                  <TouchableOpacity onPress={() => setShowNotifications(false)}>
                    <X size={22} color={C.dim} />
                  </TouchableOpacity>
                </XStack>
                <ScrollView style={{ flex: 1 }}>
                  {notificationsLoading ? (
                    <TText style={{ fontFamily: F.regular, fontSize: 14, color: C.dim, textAlign: 'center', marginTop: 24 }}>Loading...</TText>
                  ) : notifications.length > 0 ? (
                    notifications.map((notif: any) => (
                      <TouchableOpacity
                        key={notif.id}
                        style={[st.notifRow, !notif.is_read && st.notifUnread]}
                        onPress={() => { if (!notif.is_read) markAsRead(notif.id); }}
                      >
                        <YStack width={36} height={36} borderRadius={18} backgroundColor="#F0F1F5" justifyContent="center" alignItems="center" marginRight={14}>
                          {notif.notification_type === 'message' ? <ChatCircle size={16} color={C.dim} /> : <Bell size={16} color={C.dim} />}
                        </YStack>
                        <YStack flex={1}>
                          <TText style={{ fontFamily: F.semi, fontSize: 13, color: C.text }}>{notif.title}</TText>
                          <TText style={{ fontFamily: F.regular, fontSize: 11, color: C.dim, marginTop: 3 }}>{notif.message}</TText>
                        </YStack>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <TText style={{ fontFamily: F.regular, fontSize: 14, color: C.dim, textAlign: 'center', marginTop: 24 }}>No new notifications</TText>
                  )}
                </ScrollView>
              </YStack>
            </YStack>
          </Modal>

          <YStack height={80} />
        </ScrollView>
      </SafeAreaView>

      <YStack position="absolute" bottom={0} left={0} right={0}>
        <BottomNavigation activeTab="home" onTabChange={(tab: any) => onNavigate?.(tab)} />
      </YStack>
    </YStack>
  );
};

const st = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: 22 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
  notifRow: { flexDirection: 'row', padding: 12, borderRadius: 12, backgroundColor: '#F5F5F5', marginBottom: 8, alignItems: 'center' },
  notifUnread: { borderLeftWidth: 3, borderLeftColor: '#10B981' },
});
