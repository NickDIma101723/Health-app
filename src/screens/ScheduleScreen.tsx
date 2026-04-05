import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import {
  Plus,
  X,
  CheckCircle,
  XCircle,
  Trash,
  CaretLeft,
  CaretRight,
  Barbell,
  ForkKnife,
  Flower,
  VideoCamera,
  Drop,
  PersonSimpleRun,
  PersonSimpleWalk,
  Clock,
  CalendarBlank,
  Lightning,
  ArrowRight,
  SunHorizon,
  Moon,
  Sun,
  Timer,
} from 'phosphor-react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { Activity, ActivityTemplate, ActivityType } from '../contexts/ScheduleContext';
import { useScheduleAdapter } from '../hooks/useScheduleAdapter';

const { width } = Dimensions.get('window');

const F = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
} as const;

const S = {
  bg: '#FAFAFA',
  card: '#FFFFFF',
  dark: '#111111',
  lime: '#D4F940',
  text: '#1A1A1A',
  dim: '#8C8C8C',
  border: '#EEEEEE',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  warmBg: '#F5F0EB',
} as const;

interface DayData {
  date: string;
  dayName: string;
  dayNum: number;
  month: number;
  year: number;
  isToday: boolean;
}

interface ScheduleScreenProps {
  onNavigate?: (screen: string) => void;
}

const formatTime = (time: string): string => {
  const parts = time.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0]);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }
  return time;
};

const getTimeOfDay = (time: string): 'morning' | 'afternoon' | 'evening' => {
  const h = parseInt(time.split(':')[0] || '12');
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
};

const TIME_ICONS = { morning: SunHorizon, afternoon: Sun, evening: Moon };
const TIME_LABELS = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

const ICON_MAP: Record<string, any> = {
  'directions-run': PersonSimpleRun,
  'directions-walk': PersonSimpleWalk,
  'self-improvement': Flower,
  'spa': Flower,
  'restaurant': ForkKnife,
  'lunch-dining': ForkKnife,
  'dinner-dining': ForkKnife,
  'fitness-center': Barbell,
  'video-call': VideoCamera,
  'local-drink': Drop,
  'event': CalendarBlank,
};

const TYPE_META: Record<string, { icon: any; color: string; bg: string; darkBg: string }> = {
  workout:     { icon: Barbell,       color: '#10B981', bg: '#ECFDF5', darkBg: '#065F46' },
  meal:        { icon: ForkKnife,     color: '#F59E0B', bg: '#FFFBEB', darkBg: '#78350F' },
  mindfulness: { icon: Flower,        color: '#8B5CF6', bg: '#F5F3FF', darkBg: '#4C1D95' },
  appointment: { icon: VideoCamera,   color: '#3B82F6', bg: '#EFF6FF', darkBg: '#1E3A8A' },
  habit:       { icon: Drop,          color: '#3B82F6', bg: '#EFF6FF', darkBg: '#1E3A8A' },
  custom:      { icon: CalendarBlank, color: '#8C8C8C', bg: '#F5F5F5', darkBg: '#374151' },
};

// Triple ring component for goals
const TripleRing = ({ goals }: { goals: { workouts: { current: number; target: number }; meals: { current: number; target: number }; meditation: { current: number; target: number } } }) => {
  const size = 110;
  const rings = [
    { pct: goals.workouts.target > 0 ? goals.workouts.current / goals.workouts.target : 0, color: S.green, r: 48 },
    { pct: goals.meals.target > 0 ? goals.meals.current / goals.meals.target : 0, color: S.amber, r: 38 },
    { pct: goals.meditation.target > 0 ? goals.meditation.current / goals.meditation.target : 0, color: S.purple, r: 28 },
  ];
  return (
    <Svg width={size} height={size}>
      {rings.map((ring, i) => {
        const circ = 2 * Math.PI * ring.r;
        const offset = circ - Math.min(ring.pct, 1) * circ;
        return (
          <React.Fragment key={i}>
            <SvgCircle cx={size / 2} cy={size / 2} r={ring.r} stroke="rgba(255,255,255,0.08)" strokeWidth={7} fill="none" />
            <SvgCircle cx={size / 2} cy={size / 2} r={ring.r} stroke={ring.color} strokeWidth={7} fill="none"
              strokeDasharray={`${circ}`} strokeDashoffset={offset} strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`} />
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({ onNavigate }) => {
  const {
    activities,
    templates,
    weeklyGoals,
    addActivity,
    deleteActivity,
    toggleActivityStatus,
    getActivitiesForDate,
  } = useScheduleAdapter();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekDays, setWeekDays] = useState<DayData[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [customDuration, setCustomDuration] = useState('30');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [filterCat, setFilterCat] = useState('All');

  /* ── Modal Animation Refs ── */
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(300)).current;
  const detailAnim = useRef(new Animated.Value(0)).current;

  const openSheet = (setVisible: (v: boolean) => void) => {
    setVisible(true);
    overlayAnim.setValue(0);
    sheetAnim.setValue(300);
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 1, duration: 280, useNativeDriver: false, easing: Easing.out(Easing.ease) }),
      Animated.spring(sheetAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: false }),
    ]).start();
  };

  const closeSheet = (setVisible: (v: boolean) => void) => {
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: false, easing: Easing.in(Easing.ease) }),
      Animated.timing(sheetAnim, { toValue: 300, duration: 220, useNativeDriver: false, easing: Easing.in(Easing.ease) }),
    ]).start(() => setVisible(false));
  };

  const openDetail = () => {
    detailAnim.setValue(0);
    setShowActivityDetail(true);
    Animated.spring(detailAnim, { toValue: 1, tension: 65, friction: 10, useNativeDriver: false }).start();
  };

  const closeDetail = () => {
    Animated.timing(detailAnim, { toValue: 0, duration: 180, useNativeDriver: false, easing: Easing.in(Easing.ease) }).start(() => setShowActivityDetail(false));
  };

  useEffect(() => {
    const days: DayData[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const current = new Date(today);
    current.setDate(current.getDate() + (currentWeekOffset * 7));
    const dayOfWeek = current.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    current.setDate(current.getDate() + diff);
    for (let i = 0; i < 7; i++) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      days.push({ date: dateStr, dayName: current.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: current.getDate(), month: current.getMonth(), year: current.getFullYear(), isToday: dateStr === todayStr });
      current.setDate(current.getDate() + 1);
    }
    setWeekDays(days);
  }, [currentWeekOffset]);

  const dayActivities = getActivitiesForDate(selectedDate);
  const completedCount = dayActivities.filter(a => a.status === 'completed').length;
  const totalCount = dayActivities.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Group activities by time of day
  const grouped = useMemo(() => {
    const g: Record<string, Activity[]> = { morning: [], afternoon: [], evening: [] };
    dayActivities.forEach(a => { g[getTimeOfDay(a.time)].push(a); });
    return g;
  }, [dayActivities]);

  // Up next: first incomplete activity
  const upNext = dayActivities.find(a => a.status === 'incomplete');

  const handleAddFromTemplate = async (template: ActivityTemplate) => {
    const exists = activities.find(a => a.title === template.title && a.date === selectedDate);
    if (exists) { Alert.alert('Duplicate', 'This activity already exists for this date.'); return; }
    const result = await addActivity({ title: template.title, description: template.description, time: template.defaultTime || '12:00', duration: template.duration, type: template.type, color: template.color, icon: template.icon, status: 'incomplete', date: selectedDate });
    if (result?.error) { Alert.alert('Error', String(result.error)); return; }
    closeSheet(setShowQuickAdd);
  };

  const handleAddCustomActivity = async () => {
    if (!customTitle.trim() || !customTime.trim()) { Alert.alert('Missing Info', 'Enter a title and time.'); return; }
    const exists = activities.find(a => a.title === customTitle.trim() && a.date === selectedDate);
    if (exists) { Alert.alert('Duplicate', 'This activity already exists for this date.'); return; }
    const result = await addActivity({ title: customTitle, time: customTime, duration: parseInt(customDuration) || 30, type: 'custom', color: '#8C8C8C', icon: 'event', status: 'incomplete', date: selectedDate });
    if (result?.error) { Alert.alert('Error', String(result.error)); return; }
    setCustomTitle(''); setCustomTime(''); setCustomDuration('30');
    closeSheet(setShowAddCustom);
    setTimeout(() => closeSheet(setShowQuickAdd), 50);
  };

  const handleActivityPress = (activity: Activity) => { toggleActivityStatus(activity.id); };
  const handleActivityLongPress = (activity: Activity) => { setSelectedActivity(activity); openDetail(); };
  const handleDeleteActivity = () => {
    if (selectedActivity) {
      Alert.alert('Delete Activity', `Delete "${selectedActivity.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteActivity(selectedActivity.id); closeDetail(); setSelectedActivity(null); } },
      ]);
    }
  };

  const getIcon = (iconName: string, type: string) => ICON_MAP[iconName] || TYPE_META[type]?.icon || CalendarBlank;

  const selectedDateObj = new Date(selectedDate + 'T12:00:00');
  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const dateLabel = isToday ? 'Today' : selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = selectedDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const totalMinutes = dayActivities.reduce((sum, a) => sum + a.duration, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMin = totalMinutes % 60;

  return (
    <View style={st.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── HERO HEADER ── */}
        <View style={st.heroSection}>
          <View style={st.heroTop}>
            <View style={st.heroDateChip}>
              <Text style={st.heroDateChipText}>{fullDate}</Text>
            </View>
            <TouchableOpacity style={st.addBtn} onPress={() => { setFilterCat('All'); openSheet(setShowQuickAdd); }} activeOpacity={0.7}>
              <Plus size={20} weight="bold" color="#FFF" />
            </TouchableOpacity>
          </View>

          <Text style={st.heroTitle}>{dateLabel}'s{'\n'}Schedule</Text>

          {/* Quick stats row */}
          <View style={st.quickStats}>
            <View style={st.quickStat}>
              <Lightning size={14} weight="fill" color={S.lime} />
              <Text style={st.quickStatText}>{totalCount} activities</Text>
            </View>
            <View style={st.quickStatDivider} />
            <View style={st.quickStat}>
              <Timer size={14} weight="fill" color={S.amber} />
              <Text style={st.quickStatText}>{totalHours > 0 ? `${totalHours}h ${remainingMin}m` : `${remainingMin}m`}</Text>
            </View>
            <View style={st.quickStatDivider} />
            <View style={st.quickStat}>
              <CheckCircle size={14} weight="fill" color={S.green} />
              <Text style={st.quickStatText}>{completedCount} done</Text>
            </View>
          </View>
        </View>

        {/* ── WEEK NAV + DAY SELECTOR ── */}
        <View style={st.weekNav}>
          <TouchableOpacity onPress={() => setCurrentWeekOffset(o => o - 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <CaretLeft size={18} weight="bold" color={S.dim} />
          </TouchableOpacity>
          <Text style={st.weekNavLabel}>
            {weekDays.length >= 7 ? `${weekDays[0].dayName} ${weekDays[0].dayNum} – ${weekDays[6].dayName} ${weekDays[6].dayNum}` : ''}
          </Text>
          <TouchableOpacity onPress={() => setCurrentWeekOffset(o => o + 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <CaretRight size={18} weight="bold" color={S.dim} />
          </TouchableOpacity>
        </View>

        <View style={st.dayRow}>
          {weekDays.map(day => {
            const isSel = day.date === selectedDate;
            const dayActs = getActivitiesForDate(day.date);
            const hasActs = dayActs.length > 0;
            const dayCompleted = dayActs.filter(a => a.status === 'completed').length;
            const dayPct = dayActs.length > 0 ? dayCompleted / dayActs.length : 0;
            return (
              <TouchableOpacity key={day.date} style={[st.dayChip, isSel && st.dayChipSel]} onPress={() => setSelectedDate(day.date)} activeOpacity={0.7}>
                <Text style={[st.dayChipName, isSel && st.dayChipNameSel]}>{day.dayName.slice(0, 2)}</Text>
                <Text style={[st.dayChipNum, isSel && st.dayChipNumSel]}>{day.dayNum}</Text>
                {hasActs && !isSel && (
                  <View style={[st.dayDot, dayPct >= 1 && { backgroundColor: S.green }]} />
                )}
                {day.isToday && !isSel && <View style={st.todayBar} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── UP NEXT CARD ── */}
        {upNext && (() => {
          const meta = TYPE_META[upNext.type] || TYPE_META.custom;
          const Icon = getIcon(upNext.icon, upNext.type);
          return (
            <TouchableOpacity style={st.upNextCard} onPress={() => handleActivityPress(upNext)} onLongPress={() => handleActivityLongPress(upNext)} activeOpacity={0.8}>
              <View style={st.upNextLeft}>
                <Text style={st.upNextLabel}>UP NEXT</Text>
                <Text style={st.upNextTitle}>{upNext.title}</Text>
                <View style={st.upNextMeta}>
                  <Clock size={13} color="rgba(255,255,255,0.5)" />
                  <Text style={st.upNextTime}>{formatTime(upNext.time)} · {upNext.duration} min</Text>
                </View>
              </View>
              <View style={[st.upNextIcon, { backgroundColor: meta.color }]}>
                <Icon size={22} weight="fill" color="#FFF" />
              </View>
            </TouchableOpacity>
          );
        })()}

        {/* ── WEEKLY GOALS — Triple Ring Card ── */}
        <View style={st.goalsCard}>
          <View style={st.goalsCardLeft}>
            <TripleRing goals={weeklyGoals} />
          </View>
          <View style={st.goalsCardRight}>
            <Text style={st.goalsCardTitle}>Weekly Goals</Text>
            {[
              { label: 'Workouts', data: weeklyGoals.workouts, color: S.green, icon: Barbell },
              { label: 'Meals', data: weeklyGoals.meals, color: S.amber, icon: ForkKnife },
              { label: 'Meditation', data: weeklyGoals.meditation, color: S.purple, icon: Flower },
            ].map(g => {
              const GoalIcon = g.icon;
              const pct = g.data.target > 0 ? Math.min((g.data.current / g.data.target) * 100, 100) : 0;
              return (
                <View key={g.label} style={st.goalRow}>
                  <View style={[st.goalIconMini, { backgroundColor: g.color + '25' }]}>
                    <GoalIcon size={12} weight="fill" color={g.color} />
                  </View>
                  <View style={st.goalMid}>
                    <View style={st.goalLabelRow}>
                      <Text style={st.goalRowLabel}>{g.label}</Text>
                      <Text style={st.goalRowNum}>{g.data.current}<Text style={st.goalRowDenom}>/{g.data.target}</Text></Text>
                    </View>
                    <View style={st.goalMiniBar}>
                      <View style={[st.goalMiniBarFill, { width: `${pct}%`, backgroundColor: g.color }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── PROGRESS BAR ── */}
        {totalCount > 0 && (
          <View style={st.progressRow}>
            <View style={st.progressBarTrack}>
              <View style={[st.progressBarFill, { width: `${Math.min(progressPct, 100)}%` }]} />
            </View>
            <Text style={st.progressPct}>{Math.round(progressPct)}%</Text>
          </View>
        )}

        {/* ── TIMELINE ACTIVITIES ── */}
        {dayActivities.length === 0 ? (
          <View style={st.empty}>
            <View style={st.emptyCircle}>
              <CalendarBlank size={32} weight="light" color={S.dim} />
            </View>
            <Text style={st.emptyText}>No activities</Text>
            <Text style={st.emptySub}>Add your first activity for this day</Text>
            <TouchableOpacity style={st.emptyBtn} onPress={() => { setFilterCat('All'); openSheet(setShowQuickAdd); }} activeOpacity={0.7}>
              <Plus size={16} weight="bold" color="#FFF" />
              <Text style={st.emptyBtnText}>Add activity</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {(['morning', 'afternoon', 'evening'] as const).map(period => {
              const items = grouped[period];
              if (items.length === 0) return null;
              const PeriodIcon = TIME_ICONS[period];
              return (
                <View key={period} style={st.timeSection}>
                  <View style={st.timeSectionHead}>
                    <PeriodIcon size={16} weight="fill" color={S.dim} />
                    <Text style={st.timeSectionLabel}>{TIME_LABELS[period]}</Text>
                    <View style={st.timeSectionLine} />
                  </View>

                  {items.map((activity, idx) => {
                    const meta = TYPE_META[activity.type] || TYPE_META.custom;
                    const Icon = getIcon(activity.icon, activity.type);
                    const done = activity.status === 'completed';
                    const failed = activity.status === 'failed';
                    return (
                      <View key={activity.id} style={st.timelineRow}>
                        {/* Timeline line */}
                        <View style={st.timelineTrack}>
                          <View style={[st.timelineDot, done && { backgroundColor: S.green }, failed && { backgroundColor: S.red }]} />
                          {idx < items.length - 1 && <View style={st.timelineLine} />}
                        </View>

                        {/* Activity card */}
                        <TouchableOpacity
                          style={[st.actCard, failed && { opacity: 0.5 }]}
                          onPress={() => handleActivityPress(activity)}
                          onLongPress={() => handleActivityLongPress(activity)}
                          activeOpacity={0.7}
                        >
                          <View style={[st.actIconWrap, { backgroundColor: meta.bg }]}>
                            <Icon size={18} weight="fill" color={failed ? S.red : meta.color} />
                          </View>
                          <View style={st.actInfo}>
                            <Text style={[st.actTitle, done && st.actTitleDone, failed && { color: S.red }]}>{activity.title}</Text>
                            <Text style={st.actTimeDur}>{formatTime(activity.time)} · {activity.duration} min</Text>
                          </View>
                          {done ? (
                            <CheckCircle size={24} weight="fill" color={S.green} />
                          ) : failed ? (
                            <XCircle size={24} weight="fill" color={S.red} />
                          ) : (
                            <CheckCircle size={24} weight="regular" color="#DDD" />
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              );
            })}
            <Text style={st.hint}>Tap to complete · Long press for details</Text>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ===== QUICK ADD MODAL ===== */}
      <Modal visible={showQuickAdd} animationType="none" transparent onRequestClose={() => closeSheet(setShowQuickAdd)}>
        <Animated.View style={[st.modalOverlay, { backgroundColor: overlayAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)'] }) }]}>
          <Animated.View style={[st.qSheet, { transform: [{ translateY: sheetAnim }] }]}>
            {/* Drag handle */}
            <View style={st.qHandle} />

            {/* Top bar */}
            <View style={st.qTop}>
              <Text style={st.qTitle}>Add Activity</Text>
              <TouchableOpacity onPress={() => closeSheet(setShowQuickAdd)} style={st.qClose} activeOpacity={0.7}>
                <X size={18} weight="bold" color={S.dim} />
              </TouchableOpacity>
            </View>

            {/* Category chips */}
            <View style={st.qChips}>
              {['All', 'Workout', 'Meal', 'Mind'].map(c => (
                <TouchableOpacity key={c} style={[st.qChip, filterCat === c && st.qChipActive]} onPress={() => setFilterCat(c)} activeOpacity={0.7}>
                  <Text style={[st.qChipText, filterCat === c && st.qChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Template 2-column grid */}
              <View style={st.qGrid}>
                {templates.filter(t => {
                  if (filterCat === 'All') return true;
                  if (filterCat === 'Workout') return t.type === 'workout';
                  if (filterCat === 'Meal') return t.type === 'meal';
                  if (filterCat === 'Mind') return t.type === 'mindfulness';
                  return true;
                }).map(template => {
                  const meta = TYPE_META[template.type] || TYPE_META.custom;
                  const Icon = getIcon(template.icon, template.type);
                  return (
                    <TouchableOpacity key={template.id} style={st.qCard} onPress={() => handleAddFromTemplate(template)} activeOpacity={0.7}>
                      <View style={st.qCardTop}>
                        <View style={[st.qCardIcon, { backgroundColor: meta.bg }]}>
                          <Icon size={20} weight="fill" color={meta.color} />
                        </View>
                        <View style={[st.qCardBadge, { backgroundColor: meta.color + '18' }]}>
                          <Text style={[st.qCardBadgeText, { color: meta.color }]}>{template.type}</Text>
                        </View>
                      </View>
                      <Text style={st.qCardTitle} numberOfLines={1}>{template.title}</Text>
                      <View style={st.qCardFooter}>
                        <Clock size={11} color={S.dim} />
                        <Text style={st.qCardTime}>{template.defaultTime ? formatTime(template.defaultTime) : ''}</Text>
                        <Text style={st.qCardDur}>{template.duration}m</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom CTA */}
              <TouchableOpacity style={st.qCustom} onPress={() => openSheet(setShowAddCustom)} activeOpacity={0.7}>
                <View style={st.qCustomLeft}>
                  <View style={st.qCustomIcon}>
                    <Plus size={18} weight="bold" color="#FFF" />
                  </View>
                  <View>
                    <Text style={st.qCustomTitle}>Custom Activity</Text>
                    <Text style={st.qCustomSub}>Create your own</Text>
                  </View>
                </View>
                <ArrowRight size={18} weight="bold" color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* ===== CUSTOM ACTIVITY MODAL ===== */}
      <Modal visible={showAddCustom} animationType="none" transparent onRequestClose={() => closeSheet(setShowAddCustom)}>
        <Animated.View style={[st.modalOverlay, { backgroundColor: overlayAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)'] }) }]}>
          <Animated.View style={[st.cSheet, { transform: [{ translateY: sheetAnim }] }]}>
            <View style={st.qHandle} />

            {/* Header with back arrow */}
            <View style={st.cTop}>
              <TouchableOpacity onPress={() => closeSheet(setShowAddCustom)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <CaretLeft size={22} weight="bold" color={S.text} />
              </TouchableOpacity>
              <Text style={st.cTitle}>New Activity</Text>
              <View style={{ width: 22 }} />
            </View>

            {/* Big icon placeholder */}
            <View style={st.cHeroIcon}>
              <CalendarBlank size={28} weight="duotone" color={S.lime} />
            </View>

            {/* Form fields */}
            <View style={st.cForm}>
              <View style={st.cField}>
                <Text style={st.cFieldLabel}>Name</Text>
                <TextInput style={st.cInput} value={customTitle} onChangeText={setCustomTitle} placeholder="Morning Yoga, HIIT..." placeholderTextColor="#C8C8C8" />
              </View>

              <View style={st.cFieldRow}>
                <View style={st.cFieldHalf}>
                  <Text style={st.cFieldLabel}>Time</Text>
                  <View style={st.cInputRow}>
                    <Clock size={16} weight="bold" color={S.dim} />
                    <TextInput style={st.cInputInner} value={customTime} onChangeText={setCustomTime} placeholder="09:00" placeholderTextColor="#C8C8C8" />
                  </View>
                </View>
                <View style={st.cFieldHalf}>
                  <Text style={st.cFieldLabel}>Duration</Text>
                  <View style={st.cInputRow}>
                    <Timer size={16} weight="bold" color={S.dim} />
                    <TextInput style={st.cInputInner} value={customDuration} onChangeText={setCustomDuration} placeholder="30" keyboardType="numeric" placeholderTextColor="#C8C8C8" />
                    <Text style={st.cUnit}>min</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={st.cSubmit} onPress={handleAddCustomActivity} activeOpacity={0.7}>
                <Text style={st.cSubmitText}>Add to Schedule</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* ===== ACTIVITY DETAIL MODAL ===== */}
      <Modal visible={showActivityDetail} animationType="none" transparent onRequestClose={closeDetail}>
        <Animated.View style={[st.detailOverlay, { opacity: detailAnim }]}>
          <Animated.View style={[st.detailCard, { transform: [{ scale: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
            {selectedActivity && (() => {
              const meta = TYPE_META[selectedActivity.type] || TYPE_META.custom;
              const Icon = getIcon(selectedActivity.icon, selectedActivity.type);
              return (
                <>
                  <View style={[st.detailHero, { backgroundColor: meta.darkBg }]}>
                    <View style={st.detailHeroIcon}>
                      <Icon size={28} weight="fill" color="#FFF" />
                    </View>
                    <Text style={st.detailHeroTitle}>{selectedActivity.title}</Text>
                    <Text style={st.detailHeroTime}>{formatTime(selectedActivity.time)} · {selectedActivity.duration} min</Text>
                  </View>
                  <View style={st.detailBody}>
                    <TouchableOpacity style={st.detailActionBtn} onPress={() => { toggleActivityStatus(selectedActivity.id); closeDetail(); }} activeOpacity={0.7}>
                      <CheckCircle size={20} weight="fill" color={S.green} />
                      <Text style={st.detailActionText}>Toggle status</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[st.detailActionBtn, { backgroundColor: '#FEF2F2' }]} onPress={handleDeleteActivity} activeOpacity={0.7}>
                      <Trash size={20} weight="fill" color={S.red} />
                      <Text style={[st.detailActionText, { color: S.red }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={st.detailClose} onPress={closeDetail}>
                    <Text style={st.detailCloseText}>Close</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
};

/* ════════════════════════════════════════════════════════ */
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: S.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 110 },

  /* Hero */
  heroSection: { paddingTop: 0 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  heroDateChip: { backgroundColor: S.warmBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  heroDateChipText: { fontFamily: F.semi, fontSize: 12, color: S.text, letterSpacing: 0.2 },
  addBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: S.dark, justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontFamily: F.bold, fontSize: 28, color: S.text, letterSpacing: -1, lineHeight: 32, marginBottom: 10 },
  quickStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: S.card, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  quickStat: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, justifyContent: 'center' },
  quickStatText: { fontFamily: F.medium, fontSize: 12, color: S.dim },
  quickStatDivider: { width: 1, height: 16, backgroundColor: S.border },

  /* Week nav */
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 10 },
  weekNavLabel: { fontFamily: F.semi, fontSize: 13, color: S.dim },

  /* Day chips */
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, overflow: 'hidden' },
  dayChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14, marginHorizontal: 2, backgroundColor: S.card },
  dayChipSel: { backgroundColor: S.dark },
  dayChipName: { fontFamily: F.medium, fontSize: 11, color: S.dim, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  dayChipNameSel: { color: 'rgba(255,255,255,0.45)' },
  dayChipNum: { fontFamily: F.bold, fontSize: 18, color: S.text },
  dayChipNumSel: { color: '#FFF' },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: S.amber, marginTop: 5 },
  todayBar: { width: 14, height: 2.5, borderRadius: 1.5, backgroundColor: S.lime, marginTop: 5 },

  /* Up Next */
  upNextCard: { backgroundColor: S.dark, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  upNextLeft: { flex: 1 },
  upNextLabel: { fontFamily: F.semi, fontSize: 10, color: S.lime, letterSpacing: 1.5, marginBottom: 6 },
  upNextTitle: { fontFamily: F.bold, fontSize: 20, color: '#FFF', letterSpacing: -0.5 },
  upNextMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  upNextTime: { fontFamily: F.regular, fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  upNextIcon: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  /* Goals card */
  goalsCard: { backgroundColor: S.dark, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  goalsCardLeft: { marginRight: 14, flexShrink: 0 },
  goalsCardRight: { flex: 1 },
  goalsCardTitle: { fontFamily: F.bold, fontSize: 15, color: '#FFF', marginBottom: 12 },
  goalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  goalIconMini: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10, flexShrink: 0 },
  goalMid: { flex: 1 },
  goalLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  goalRowLabel: { fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  goalRowNum: { fontFamily: F.bold, fontSize: 13, color: '#FFF' },
  goalRowDenom: { fontFamily: F.regular, fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  goalMiniBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
  goalMiniBarFill: { height: 4, borderRadius: 2 },

  /* Progress bar */
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  progressBarTrack: { flex: 1, height: 6, backgroundColor: '#EEEEEE', borderRadius: 3 },
  progressBarFill: { height: 6, backgroundColor: S.lime, borderRadius: 3 },
  progressPct: { fontFamily: F.bold, fontSize: 14, color: S.text, minWidth: 36 },

  /* Time sections */
  timeSection: { marginBottom: 20 },
  timeSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  timeSectionLabel: { fontFamily: F.semi, fontSize: 13, color: S.dim },
  timeSectionLine: { flex: 1, height: 1, backgroundColor: S.border, marginLeft: 6 },

  /* Timeline row */
  timelineRow: { flexDirection: 'row', marginBottom: 0 },
  timelineTrack: { width: 24, alignItems: 'center', marginRight: 8 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#DDD', marginTop: 16 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#EEEEEE', marginVertical: 2 },

  /* Activity card */
  actCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: S.card, borderRadius: 16, padding: 14, gap: 12, marginBottom: 8 },
  actIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actInfo: { flex: 1 },
  actTitle: { fontFamily: F.semi, fontSize: 15, color: S.text, marginBottom: 2 },
  actTitleDone: { textDecorationLine: 'line-through', color: S.dim },
  actTimeDur: { fontFamily: F.regular, fontSize: 12, color: S.dim },

  /* Hint */
  hint: { fontFamily: F.regular, fontSize: 12, color: '#CCC', textAlign: 'center', marginTop: 4, marginBottom: 8 },

  /* Empty */
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyText: { fontFamily: F.semi, fontSize: 17, color: S.text },
  emptySub: { fontFamily: F.regular, fontSize: 13, color: S.dim, marginTop: 4, marginBottom: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: S.dark, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText: { fontFamily: F.semi, fontSize: 14, color: '#FFF' },

  /* ── Overlay ── */
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },

  /* ── Quick Add Sheet ── */
  qSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%' },
  qHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  qTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  qTitle: { fontFamily: F.bold, fontSize: 26, color: S.text, letterSpacing: -0.8 },
  qClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center' },
  qChips: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 14 },
  qChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F2F2F2' },
  qChipActive: { backgroundColor: S.dark },
  qChipText: { fontFamily: F.semi, fontSize: 12, color: S.dim },
  qChipTextActive: { color: '#FFF' },

  /* Template 2-col grid */
  qGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10 },
  qCard: { width: (width - 50) / 2, backgroundColor: S.bg, borderRadius: 18, padding: 14 },
  qCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  qCardIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  qCardBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  qCardBadgeText: { fontFamily: F.semi, fontSize: 10, textTransform: 'capitalize' },
  qCardTitle: { fontFamily: F.bold, fontSize: 15, color: S.text, letterSpacing: -0.3, marginBottom: 6 },
  qCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qCardTime: { fontFamily: F.regular, fontSize: 11, color: S.dim },
  qCardDur: { fontFamily: F.semi, fontSize: 11, color: S.dim, marginLeft: 'auto' },

  /* Custom CTA dark card */
  qCustom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 14, backgroundColor: S.dark, borderRadius: 18, padding: 16 },
  qCustomLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qCustomIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: S.lime, justifyContent: 'center', alignItems: 'center' },
  qCustomTitle: { fontFamily: F.bold, fontSize: 15, color: '#FFF', letterSpacing: -0.3 },
  qCustomSub: { fontFamily: F.regular, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 },

  /* ── Custom Activity Sheet ── */
  cSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  cTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 },
  cTitle: { fontFamily: F.bold, fontSize: 18, color: S.text, letterSpacing: -0.3 },
  cHeroIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: S.dark, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginTop: 8, marginBottom: 4 },

  /* Form */
  cForm: { paddingHorizontal: 20, paddingBottom: 34 },
  cField: { marginTop: 18 },
  cFieldLabel: { fontFamily: F.semi, fontSize: 12, color: S.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  cInput: { backgroundColor: '#F5F5F5', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontFamily: F.medium, fontSize: 16, color: S.text },
  cFieldRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  cFieldHalf: { flex: 1 },
  cInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, gap: 8 },
  cInputInner: { flex: 1, fontFamily: F.medium, fontSize: 16, color: S.text, padding: 0 },
  cUnit: { fontFamily: F.medium, fontSize: 13, color: S.dim },
  cSubmit: { marginTop: 28, backgroundColor: S.dark, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  cSubmitText: { fontFamily: F.bold, fontSize: 15, color: '#FFF', letterSpacing: -0.2 },

  /* Detail modal */
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  detailCard: { backgroundColor: '#FFF', borderRadius: 28, width: '88%', maxWidth: 400, overflow: 'hidden' },
  detailHero: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 },
  detailHeroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  detailHeroTitle: { fontFamily: F.bold, fontSize: 22, color: '#FFF', letterSpacing: -0.5 },
  detailHeroTime: { fontFamily: F.medium, fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  detailBody: { flexDirection: 'row', padding: 16, gap: 10 },
  detailActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, backgroundColor: '#F5F5F5', borderRadius: 14 },
  detailActionText: { fontFamily: F.semi, fontSize: 13, color: S.text },
  detailClose: { padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  detailCloseText: { fontFamily: F.semi, fontSize: 14, color: S.dim },
});
