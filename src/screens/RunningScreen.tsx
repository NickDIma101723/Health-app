import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, StatusBar, SafeAreaView } from 'react-native';
import { PersonSimpleRun, PersonSimpleWalk, Bicycle, Play, MapPin, Timer, Flame, TrendUp, CaretRight, Trophy, Lightning, CalendarBlank } from 'phosphor-react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const F = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
} as const;

export interface RunSession {
  id: string;
  date: string;
  distanceKm: number;
  durationSec: number;
  calories: number;
  avgPace: string;
  activityType: 'run' | 'walk' | 'cycle';
  splits?: number[];
}

const STORAGE_KEY = 'run_sessions';

const formatDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en', { weekday: 'long' });
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
};

const typeLabels: Record<string, string> = { run: 'Run', walk: 'Walk', cycle: 'Ride' };

type FilterType = 'all' | 'run' | 'walk' | 'cycle';

const FILTER_ICONS: Record<FilterType, any> = {
  all: Lightning,
  run: PersonSimpleRun,
  cycle: Bicycle,
  walk: PersonSimpleWalk,
};

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'run', label: 'Run' },
  { key: 'cycle', label: 'Cycle' },
  { key: 'walk', label: 'Walk' },
];

const SESSION_COLORS: Record<string, { icon: any; color: string; bg: string }> = {
  run: { icon: PersonSimpleRun, color: '#10B981', bg: '#ECFDF5' },
  walk: { icon: PersonSimpleWalk, color: '#F59E0B', bg: '#FFFBEB' },
  cycle: { icon: Bicycle, color: '#3B82F6', bg: '#EFF6FF' },
};

export const RunningScreen: React.FC<{ onNavigate?: (screen: string) => void }> = ({ onNavigate }) => {
  const [sessions, setSessions] = useState<RunSession[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setSessions(JSON.parse(raw).sort((a: RunSession, b: RunSession) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch {}
  };

  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.activityType === filter);

  // Summary stats (based on filter)
  const totalRuns = filtered.length;
  const totalDistanceKm = filtered.reduce((s, r) => s + r.distanceKm, 0);
  const totalDurationSec = filtered.reduce((s, r) => s + r.durationSec, 0);
  const totalCalories = filtered.reduce((s, r) => s + r.calories, 0);
  const weekSessions = filtered.filter(s => {
    const diff = (Date.now() - new Date(s.date).getTime()) / 86400000;
    return diff <= 7;
  });
  const weekDistance = weekSessions.reduce((s, r) => s + r.distanceKm, 0);
  const weeklyGoalKm = 20;
  const weekProgress = Math.min(weekDistance / weeklyGoalKm, 1);
  const activeFilter = FILTERS.find(f => f.key === filter)!;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1, paddingTop: 10 }}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Activity</Text>
            <View style={styles.workoutBadge}>
              <Lightning size={16} color="#111" weight="fill" />
              <Text style={styles.workoutBadgeText}>
                {sessions.length} {sessions.length === 1 ? 'Workout' : 'Workouts'}
              </Text>
            </View>
          </View>
          <Text style={styles.headerSub}>Track your fitness journey</Text>
        </View>

        {/* Activity Type Tabs */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            const Icon = FILTER_ICONS[f.key];
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterTab, active && styles.filterTabActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.7}
              >
                <Icon size={16} weight={active ? 'fill' : 'regular'} color={active ? '#FFF' : '#999'} />
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Weekly Goal — Dark Hero Card */}
        <View style={styles.weekCard}>
          <View style={styles.weekCardTop}>
            <View>
              <Text style={styles.weekLabel}>This Week</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={styles.weekBigNum}>{weekDistance.toFixed(1)}</Text>
                <Text style={styles.weekBigUnit}>km</Text>
              </View>
            </View>
            <Svg width={56} height={56}>
              <SvgCircle cx={28} cy={28} r={23} stroke="rgba(255,255,255,0.12)" strokeWidth={4.5} fill="none" />
              <SvgCircle cx={28} cy={28} r={23} stroke="#D4F940" strokeWidth={4.5} fill="none"
                strokeDasharray={`${2 * Math.PI * 23}`}
                strokeDashoffset={`${2 * Math.PI * 23 * (1 - weekProgress)}`}
                strokeLinecap="round" transform={`rotate(-90, 28, 28)`}
              />
            </Svg>
          </View>
          <View style={styles.weekBarTrack}>
            <View style={[styles.weekBarFill, { width: `${weekProgress * 100}%` }]} />
          </View>
          <View style={styles.weekCardBottom}>
            <Text style={styles.weekGoalText}>{weeklyGoalKm} km goal</Text>
            <Text style={styles.weekCountText}>{weekSessions.length} workout{weekSessions.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Start Workout Button */}
        <TouchableOpacity style={styles.startBtn} activeOpacity={0.85} onPress={() => onNavigate?.('activity-map')}>
          <View style={styles.startBtnIcon}>
            <Play size={16} color="#111" weight="fill" />
          </View>
          <Text style={styles.startBtnText}>Start Workout</Text>
          <CaretRight size={18} color="rgba(255,255,255,0.4)" weight="bold" />
        </TouchableOpacity>

        {/* All-time Stats */}
        <Text style={styles.sectionLabel}>All Time</Text>
        <View style={styles.statsDark}>
          <View style={styles.statsDarkMain}>
            <Text style={styles.statsDarkLabel}>Total Distance</Text>
            <Text style={styles.statsDarkBig}>{totalDistanceKm.toFixed(1)} <Text style={styles.statsDarkBigUnit}>km</Text></Text>
          </View>
          <View style={styles.statsDarkRow}>
            <View style={styles.statsDarkItem}>
              <Text style={styles.statsDarkSmLabel}>Duration</Text>
              <Text style={styles.statsDarkSmVal}>{totalDurationSec > 3600 ? `${(totalDurationSec / 3600).toFixed(1)} hrs` : `${Math.floor(totalDurationSec / 60)} min`}</Text>
            </View>
            <View style={styles.statsDarkSep} />
            <View style={styles.statsDarkItem}>
              <Text style={styles.statsDarkSmLabel}>Calories</Text>
              <Text style={styles.statsDarkSmVal}>{totalCalories >= 1000 ? `${(totalCalories / 1000).toFixed(1)}k` : totalCalories} kcal</Text>
            </View>
            <View style={styles.statsDarkSep} />
            <View style={styles.statsDarkItem}>
              <Text style={styles.statsDarkSmLabel}>Workouts</Text>
              <Text style={styles.statsDarkSmVal}>{totalRuns}</Text>
            </View>
          </View>
        </View>

        {/* Recent Activities */}
        <Text style={styles.sectionLabel}>Recent</Text>
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <PersonSimpleRun size={32} color="#D4D4D4" weight="regular" />
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptySub}>{filter === 'all' ? 'Start a workout to see your activity here' : `No ${activeFilter.label.toLowerCase()} sessions yet`}</Text>
          </View>
        ) : (
          filtered.slice(0, 15).map((session) => {
            const sc = SESSION_COLORS[session.activityType] || SESSION_COLORS.run;
            const Icon = sc.icon;
            return (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionLeft}>
                  <View style={[styles.sessionIcon, { backgroundColor: sc.bg }]}>
                    <Icon size={16} color={sc.color} weight="fill" />
                  </View>
                  <View>
                    <Text style={styles.sessionTitle}>{typeLabels[session.activityType] || 'Run'}</Text>
                    <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                  </View>
                </View>
                <View style={styles.sessionRight}>
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatVal}>{session.distanceKm.toFixed(2)}</Text>
                    <Text style={styles.sessionStatUnit}>km</Text>
                  </View>
                  <View style={styles.sessionDivider} />
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatVal}>{formatDuration(session.durationSec)}</Text>
                  </View>
                  <View style={styles.sessionDivider} />
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatVal}>{session.calories}</Text>
                    <Text style={styles.sessionStatUnit}>cal</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

  header: { marginBottom: 20 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  headerTitle: { fontFamily: F.bold, fontSize: 32, color: '#111', letterSpacing: -1 },
  headerSub: { fontFamily: F.medium, fontSize: 13, color: '#999', marginTop: 2 },
  workoutBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D4F940', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  workoutBadgeText: { fontFamily: F.bold, fontSize: 13, color: '#111' },

  /* Filter tabs */
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 100, backgroundColor: '#F0F0F0' },
  filterTabActive: { backgroundColor: '#111' },
  filterTabText: { fontFamily: F.medium, fontSize: 13, color: '#999' },
  filterTabTextActive: { fontFamily: F.semi, color: '#FFF' },

  /* Weekly Goal — Dark card */
  weekCard: { backgroundColor: '#111', borderRadius: 20, padding: 18, marginBottom: 14 },
  weekCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  weekLabel: { fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  weekBigNum: { fontFamily: F.bold, fontSize: 36, color: '#FFF', letterSpacing: -1.5, lineHeight: 40 },
  weekBigUnit: { fontFamily: F.medium, fontSize: 14, color: 'rgba(255,255,255,0.45)' },
  weekBarTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 10 },
  weekBarFill: { height: 4, backgroundColor: '#D4F940', borderRadius: 2 },
  weekCardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  weekGoalText: { fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  weekCountText: { fontFamily: F.medium, fontSize: 12, color: '#D4F940' },

  /* Start button — dark */
  startBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 24 },
  startBtnIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#D4F940', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  startBtnText: { flex: 1, fontFamily: F.semi, fontSize: 15, color: '#FFF' },

  /* Stats — dark card */
  sectionLabel: { fontFamily: F.semi, fontSize: 13, color: '#8C8C8C', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsDark: { backgroundColor: '#111', borderRadius: 20, padding: 20, marginBottom: 24 },
  statsDarkMain: { marginBottom: 18 },
  statsDarkLabel: { fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 4 },
  statsDarkBig: { fontFamily: F.bold, fontSize: 40, color: '#D4F940', letterSpacing: -1.5, lineHeight: 44 },
  statsDarkBigUnit: { fontFamily: F.regular, fontSize: 16, color: 'rgba(255,255,255,0.3)' },
  statsDarkRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 14 },
  statsDarkItem: { flex: 1 },
  statsDarkSmLabel: { fontFamily: F.medium, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 3 },
  statsDarkSmVal: { fontFamily: F.semi, fontSize: 15, color: '#FFF' },
  statsDarkSep: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 2 },

  /* Sessions */
  sessionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, borderWidth: 1, borderColor: '#EEEEEE' },
  sessionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sessionTitle: { fontFamily: F.semi, fontSize: 14, color: '#111' },
  sessionDate: { fontFamily: F.regular, fontSize: 11, color: '#8C8C8C', marginTop: 1 },
  sessionRight: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  sessionStat: { alignItems: 'center', paddingHorizontal: 8 },
  sessionStatVal: { fontFamily: F.semi, fontSize: 13, color: '#111' },
  sessionStatUnit: { fontFamily: F.regular, fontSize: 9, color: '#8C8C8C' },
  sessionDivider: { width: 1, height: 20, backgroundColor: '#EEEEEE' },

  /* Empty */
  emptyCard: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#EEEEEE' },
  emptyTitle: { fontFamily: F.semi, fontSize: 15, color: '#111', marginTop: 12 },
  emptySub: { fontFamily: F.regular, fontSize: 12, color: '#8C8C8C', marginTop: 4 },
});
