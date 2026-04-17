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
import { Bell, ArrowUpRight, ArrowRight, Scales, Flame, ForkKnife, Check, X, ChatCircle, Heartbeat, Barbell, Timer, Lightning, CalendarBlank, TrendUp, Fire, SneakerMove, Moon, Drop, Trophy, Sparkle } from 'phosphor-react-native';
import Svg, { Path, Circle as SvgCircle, Rect, Line, Defs, Pattern, ClipPath, G, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { XStack, YStack, Card, Text as TText } from 'tamagui';
import { BlurView } from 'expo-blur';
import { useAuth } from '../contexts/AuthContext';
import { PlatformPressable } from '../components/AnimatedPressable';
import { CircularProgress } from '../components';
import { useHealthMetrics, useUserGoals, useNotifications, useNutritionAdapter, useScheduleAdapter } from '../hooks';
import { supabase } from '../lib/supabase';
import { T } from '../tamagui.config';

const { width, height } = Dimensions.get('window');

const defaultTheme = {
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
const clientTheme = defaultTheme;
const coachTheme = {
  ...defaultTheme,
  bg: '#0D0D14',
  card: '#1A1A28',
  text: '#FFFFFF',
  dim: '#8C8C8C',
  border: '#2A2A3C',
  warmBg: '#1A1A28',
  dark: '#111111',
  cardDark: '#111111',
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
const SCROLL_CARD_H = 225;

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
const GlassButton = ({ label, dark = false }: { label: string; dark?: boolean }) => { const {currentMode} = useAuth(); const C = currentMode === 'coach' ? coachTheme : clientTheme; return (
  <YStack borderRadius={19} overflow="hidden">
    <BlurView intensity={40} tint={dark ? 'light' : 'dark'} style={{ paddingHorizontal: 17, paddingVertical: 9 }}>
      <TText style={{ fontFamily: F.semi, fontSize: 13, color: dark ? '#FFF' : C.text }}>{label}</TText>
    </BlurView>
  </YStack>
);}

interface HomeScreenProps {
  onNavigate?: (screen: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { user, currentMode } = useAuth();
  const C = currentMode === 'coach' ? coachTheme : clientTheme;
  const styles = React.useMemo(() => getStyles(C), [currentMode]);

  const { metrics } = useHealthMetrics();
  const { goals } = useUserGoals();
  const { getDailyNutrition, goals: nutritionGoals } = useNutritionAdapter();
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
              <XStack alignItems="center" gap={12}>
                <PlatformPressable onPress={() => onNavigate?.('profile')} style={{ borderRadius: 28 }}>
                  <YStack width={52} height={52} borderRadius={26} backgroundColor={C.lime} alignItems="center" justifyContent="center">
                    {avatarUrl ? (
                      <ImageBackground source={{ uri: avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} imageStyle={{ borderRadius: 22 }} />
                    ) : (
                      <TText style={{ color: C.text, fontFamily: F.bold, fontSize: 20 }}>{profileName.charAt(0)}</TText>
                    )}
                  </YStack>
                </PlatformPressable>
                <YStack>
                  <TText style={{ fontFamily: F.regular, fontSize: 13, color: C.dim }}>{greeting}</TText>
                  <TText style={{ fontFamily: F.bold, fontSize: 18, color: C.text, letterSpacing: -0.3, marginTop: 1 }}>
                    {formatName(profileName)}
                  </TText>
                </YStack>
              </XStack>
              <PlatformPressable style={styles.iconBtn} onPress={() => setShowNotifications(true)}>
                <Bell size={20} color={C.text} weight={unreadCount > 0 ? 'fill' : 'regular'} />
                {unreadCount > 0 && (
                  <YStack position="absolute" top={-2} right={-2} minWidth={18} height={18} borderRadius={9}
                    backgroundColor="#EF4444" alignItems="center" justifyContent="center"
                    paddingHorizontal={4} borderWidth={2} borderColor="#FFF"
                  >
                    <TText style={{ fontFamily: F.bold, fontSize: 9, color: '#FFF' }}>{unreadCount > 9 ? '9+' : unreadCount}</TText>
                  </YStack>
                )}
              </PlatformPressable>
            </XStack>
          </Animated.View>

          {/* ── HERO SECTION ── */}
          <Animated.View entering={FadeInDown.delay(50).duration(700).springify()} style={{ marginTop: 24, marginBottom: GAP + 4 }}>
            {/* date chip */}
            <YStack alignSelf="flex-start" backgroundColor="#F5F0EB" borderRadius={20} paddingHorizontal={14} paddingVertical={7} marginBottom={16}>
              <TText style={{ fontFamily: F.semi, fontSize: 12, color: C.text, letterSpacing: 0.2 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
              </TText>
            </YStack>

            {/* big headline */}
            <TText style={{ fontFamily: F.bold, fontSize: 42, color: C.text, letterSpacing: -1.8, lineHeight: 46 }}>
              Your Week{'\n'}In Motion
            </TText>

            {/* streak row */}
            <XStack alignItems="center" marginTop={20} gap={6}>
              {streakLabels.map((day, i) => (
                <YStack key={i} width={38} height={38} borderRadius={19}
                  backgroundColor={streakDays[i] ? '#EF4444' : '#EEEEEE'}
                  alignItems="center" justifyContent="center"
                >
                  <TText style={{ fontFamily: F.semi, fontSize: 12, color: streakDays[i] ? '#FFF' : C.dim }}>{day}</TText>
                </YStack>
              ))}
              <YStack marginLeft={6}>
                <TText style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>3 day streak</TText>
                <TText style={{ fontFamily: F.regular, fontSize: 12, color: C.dim, marginTop: -1 }}>Keep it going!</TText>
              </YStack>
            </XStack>
          </Animated.View>

          {/* ── WEEKLY GOAL ── */}
          <Animated.View entering={FadeInDown.delay(80).duration(500).springify()} style={{ marginBottom: GAP }}>
            <Card borderRadius={20} overflow="hidden" padding={0} backgroundColor="#F5F0EB">
              <XStack padding={16} paddingVertical={14} alignItems="center" justifyContent="space-between">
                <YStack>
                  <TText style={{ fontFamily: F.semi, fontSize: 11, color: 'rgba(0,0,0,0.35)', letterSpacing: 1 }}>WEEKLY GOAL</TText>
                  <XStack marginTop={4} alignItems="baseline" gap={4}>
                    <TText style={{ fontFamily: F.bold, fontSize: 26, color: C.text, letterSpacing: -1 }}>{Math.round(calBurned / 138)}h</TText>
                    <TText style={{ fontFamily: F.medium, fontSize: 13, color: 'rgba(0,0,0,0.25)' }}>/ 20h</TText>
                  </XStack>
                </YStack>
                <YStack alignItems="flex-end" gap={6}>
                  <TText style={{ fontFamily: F.bold, fontSize: 22, color: C.text }}>{calPct}%</TText>
                  <TText style={{ fontFamily: F.regular, fontSize: 11, color: 'rgba(0,0,0,0.35)' }}>5 sessions · 1,380 kcal</TText>
                </YStack>
              </XStack>
            </Card>
          </Animated.View>

          {/* ── HEART RATE ── */}
          <Animated.View entering={FadeInDown.delay(160).duration(500).springify()} style={{ marginBottom: GAP }}>
            <Card borderRadius={20} overflow="hidden" padding={0} backgroundColor={C.cardDark}>
              <YStack padding={18}>
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

                <TText style={{ fontFamily: F.bold, fontSize: 44, color: '#FFF', letterSpacing: -2, marginTop: 10 }}>
                  {heartRate} <TText style={{ fontSize: 15, fontFamily: F.regular, color: 'rgba(255,255,255,0.3)' }}>bpm</TText>
                </TText>

                {/* wave chart */}
                <YStack marginTop={14} height={80}>
                  <Svg width={width - (PAD * 2) - 36} height={80} viewBox={`0 0 ${width - (PAD * 2) - 36} 80`}>
                    <Defs>
                      <SvgLinearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#EF4444" stopOpacity="0.3" />
                        <Stop offset="1" stopColor="#EF4444" stopOpacity="0" />
                      </SvgLinearGradient>
                    </Defs>
                    {(() => {
                      const w = width - (PAD * 2) - 36;
                      const pts = [62, 68, 58, 72, 90, 124, 105, 88, 95, 110, 98, 85, 78, 92, 108, 120, 124];
                      const minV = 50, maxV = 130;
                      const segW = w / (pts.length - 1);
                      const toY = (v: number) => 80 - ((v - minV) / (maxV - minV)) * 70;
                      let d = `M0,${toY(pts[0])}`;
                      for (let i = 1; i < pts.length; i++) {
                        const x0 = (i - 1) * segW, x1 = i * segW;
                        const y0 = toY(pts[i - 1]), y1 = toY(pts[i]);
                        const cx1 = x0 + segW * 0.4, cx2 = x1 - segW * 0.4;
                        d += ` C${cx1},${y0} ${cx2},${y1} ${x1},${y1}`;
                      }
                      const fillD = d + ` L${w},80 L0,80 Z`;
                      return (
                        <>
                          <Path d={fillD} fill="url(#hrGrad)" />
                          <Path d={d} stroke="#EF4444" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                          <SvgCircle cx={(pts.length - 1) * segW} cy={toY(pts[pts.length - 1])} r={4} fill="#EF4444" />
                          <SvgCircle cx={(pts.length - 1) * segW} cy={toY(pts[pts.length - 1])} r={7} fill="rgba(239,68,68,0.2)" />
                        </>
                      );
                    })()}
                  </Svg>
                </YStack>

                <XStack marginTop={8} justifyContent="space-between">
                  <TText style={{ fontFamily: F.regular, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Resting 62</TText>
                  <TText style={{ fontFamily: F.regular, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Range 56–172</TText>
                </XStack>
              </YStack>
            </Card>
          </Animated.View>

          {/* ── NUTRITION WIDGET ── */}
          <Animated.View entering={FadeInDown.delay(260).duration(500).springify()} style={{ marginBottom: GAP }}>
            <PlatformPressable onPress={() => onNavigate?.('nutrition')}>
              <Card borderRadius={20} overflow="hidden" padding={0} backgroundColor={C.cardDark}>
                <YStack padding={18}>
                  <XStack justifyContent="space-between" alignItems="center" marginBottom={24}>
                    <XStack alignItems="center" gap={10}>
                      <YStack width={34} height={34} borderRadius={17} backgroundColor="rgba(16,185,129,0.15)" alignItems="center" justifyContent="center">
                        <ForkKnife size={16} color={C.accent} weight="fill" />
                      </YStack>
                      <TText style={{ fontFamily: F.semi, fontSize: 16, color: '#FFF' }}>Energy & Macros</TText>
                    </XStack>
                    <ArrowRight size={18} color="rgba(255,255,255,0.3)" weight="bold" />
                  </XStack>

                  <XStack alignItems="center" gap={24}>
                    <YStack width={100} height={100} alignItems="center" justifyContent="center">
                      <Svg width={100} height={100} viewBox="0 0 100 100" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                        <SvgCircle cx={50} cy={50} r={42} stroke="rgba(255,255,255,0.06)" strokeWidth={10} fill="none" />
                        <SvgCircle cx={50} cy={50} r={42} stroke={C.accent} strokeWidth={10} fill="none" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 42}
                          strokeDashoffset={2 * Math.PI * 42 * (1 - Math.min(todayNutrition.calories / (nutritionGoals.calories || 1), 1))}
                        />
                      </Svg>
                      <YStack alignItems="center" marginTop={2}>
                        <TText style={{ fontFamily: F.bold, fontSize: 24, color: '#FFF', letterSpacing: -1 }}>
                          {Math.round(todayNutrition.calories)}
                        </TText>
                        <TText style={{ fontFamily: F.medium, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: -2 }}>
                          / {Math.round(nutritionGoals.calories)}
                        </TText>
                      </YStack>
                    </YStack>

                    <YStack flex={1} gap={14}>
                      {[
                        { name: 'Protein', qty: todayNutrition.protein, goal: nutritionGoals.protein, color: '#F59E0B' },
                        { name: 'Carbs', qty: todayNutrition.carbs, goal: nutritionGoals.carbs, color: '#3B82F6' },
                        { name: 'Fats', qty: todayNutrition.fats, goal: nutritionGoals.fats, color: '#EF4444' },
                      ].map((m, i) => (
                        <YStack key={i} gap={6}>
                          <XStack justifyContent="space-between" alignItems="flex-end">
                            <TText style={{ fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{m.name}</TText>
                            <TText style={{ fontFamily: F.semi, fontSize: 12, color: '#FFF' }}>
                              {Math.round(m.qty)}<TText style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}> / {m.goal}g</TText>
                            </TText>
                          </XStack>
                          <YStack width="100%" height={6} backgroundColor="rgba(255,255,255,0.06)" borderRadius={3} overflow="hidden">
                            <YStack width={`${Math.min((m.qty / (m.goal || 1)) * 100, 100)}%`} height="100%" backgroundColor={m.color} borderRadius={3} />
                          </YStack>
                        </YStack>
                      ))}
                    </YStack>
                  </XStack>
                </YStack>
              </Card>
            </PlatformPressable>
          </Animated.View>

          {/* ── FILTER CHIPS ── */}
          <Animated.View entering={FadeInDown.delay(300).duration(500).springify()} style={{ marginTop: 8, marginBottom: 4 }}>
            <TText style={{ fontFamily: F.bold, fontSize: 20, color: C.text, letterSpacing: -0.5 }}>Discover</TText>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(320).duration(500).springify()} style={{ marginBottom: 16, marginHorizontal: -PAD }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: PAD }}>
              {FILTER_CHIPS.map((chip, idx) => (
                <PlatformPressable key={chip} onPress={() => setActiveFilter(chip)} style={{
                  paddingHorizontal: 22, paddingVertical: 12, borderRadius: 26,
                  backgroundColor: activeFilter === chip ? C.cardDark : '#F5F5F5',
                  borderWidth: activeFilter === chip ? 0 : 1,
                  borderColor: '#D4D4D4',
                  marginLeft: idx === 0 ? PAD : 0,
                  marginRight: idx === FILTER_CHIPS.length - 1 ? 0 : 6,
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
              contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 8 }}
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
            <YStack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end">
              <YStack backgroundColor="#FFF" borderTopLeftRadius={32} borderTopRightRadius={32} height={height * 0.65}>
                {/* handle bar */}
                <YStack alignItems="center" paddingTop={12} paddingBottom={6}>
                  <YStack width={40} height={4} borderRadius={2} backgroundColor="#E0E0E0" />
                </YStack>
                <XStack justifyContent="space-between" alignItems="center" paddingHorizontal={24} paddingBottom={16}>
                  <YStack>
                    <TText style={{ fontFamily: F.bold, fontSize: 22, color: C.text, letterSpacing: -0.5 }}>Notifications</TText>
                    {unreadCount > 0 && (
                      <TText style={{ fontFamily: F.regular, fontSize: 12, color: C.dim, marginTop: 2 }}>
                        {unreadCount} unread
                      </TText>
                    )}
                  </YStack>
                  <PlatformPressable
                    onPress={() => setShowNotifications(false)}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={18} color={C.dim} />
                  </PlatformPressable>
                </XStack>
                <YStack height={1} backgroundColor="#F0F0F0" />
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingTop: 16 }}>
                  {notificationsLoading ? (
                    <YStack alignItems="center" justifyContent="center" paddingVertical={48}>
                      <YStack width={48} height={48} borderRadius={24} backgroundColor="#F5F5F5" alignItems="center" justifyContent="center" marginBottom={12}>
                        <Bell size={20} color={C.dim} />
                      </YStack>
                      <TText style={{ fontFamily: F.medium, fontSize: 14, color: C.dim }}>Loading notifications...</TText>
                    </YStack>
                  ) : notifications.length > 0 ? (
                    notifications.map((notif: any, index: number) => {
                      const isMessage = notif.notification_type === 'message';
                      const iconBg = isMessage ? 'rgba(59,130,246,0.08)' : (!notif.is_read ? 'rgba(16,185,129,0.08)' : '#F5F5F5');
                      const iconColor = isMessage ? '#3B82F6' : (!notif.is_read ? C.accent : C.dim);
                      return (
                        <PlatformPressable
                          key={notif.id}
                          onPress={() => { if (!notif.is_read) markAsRead(notif.id); }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            padding: 14,
                            borderRadius: 16,
                            backgroundColor: !notif.is_read ? 'rgba(16,185,129,0.04)' : 'transparent',
                            marginBottom: 4,
                          }}
                        >
                          <YStack width={40} height={40} borderRadius={14} backgroundColor={iconBg}
                            justifyContent="center" alignItems="center" marginRight={14}
                          >
                            {isMessage ? <ChatCircle size={18} color={iconColor} weight="fill" /> : <Bell size={18} color={iconColor} weight={!notif.is_read ? 'fill' : 'regular'} />}
                          </YStack>
                          <YStack flex={1}>
                            <XStack justifyContent="space-between" alignItems="center">
                              <TText style={{ fontFamily: F.semi, fontSize: 14, color: C.text, flex: 1 }}>{notif.title}</TText>
                              {!notif.is_read && <YStack width={8} height={8} borderRadius={4} backgroundColor={C.accent} marginLeft={8} />}
                            </XStack>
                            <TText style={{ fontFamily: F.regular, fontSize: 12, color: C.dim, marginTop: 4, lineHeight: 18 }}>{notif.message}</TText>
                            <TText style={{ fontFamily: F.regular, fontSize: 10, color: 'rgba(0,0,0,0.2)', marginTop: 6 }}>
                              {notif.created_at ? new Date(notif.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            </TText>
                          </YStack>
                        </PlatformPressable>
                      );
                    })
                  ) : (
                    <YStack alignItems="center" justifyContent="center" paddingVertical={48}>
                      <YStack width={64} height={64} borderRadius={32} backgroundColor="#F5F5F5" alignItems="center" justifyContent="center" marginBottom={14}>
                        <Bell size={26} color="#D4D4D4" />
                      </YStack>
                      <TText style={{ fontFamily: F.semi, fontSize: 15, color: C.text }}>All caught up!</TText>
                      <TText style={{ fontFamily: F.regular, fontSize: 13, color: C.dim, marginTop: 4 }}>No new notifications</TText>
                    </YStack>
                  )}
                </ScrollView>
              </YStack>
            </YStack>
          </Modal>

          <YStack height={110} />
        </ScrollView>
      </SafeAreaView>
    </YStack>
  );
};

const getStyles = (C: any) => StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: 22 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
});
