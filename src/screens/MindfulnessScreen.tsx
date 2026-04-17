import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import {
  Wind, Square, Moon, Sun, FlowerLotus, MoonStars, PersonArmsSpread,
  Timer, Heart, Leaf, Clock, Play, Pause, Stop, Lightbulb, MusicNote,
  PlayCircle, Sparkle, Fire, CheckCircle, X, Trophy, ChartLineUp, Smiley,
  PencilSimple, Plus,
} from 'phosphor-react-native';
import { useMindfulnessSessions, useMoodLogs } from '../hooks';

const defaultTheme = {
  bg: '#FAFAFA',
  card: '#FFFFFF',
  cardDark: '#111111',
  text: '#1A1A1A',
  textDim: '#8C8C8C',
  border: '#EEEEEE',
  surfaceMuted: '#F5F0EB',
  accent: '#10B981',
  accentSoft: 'rgba(16, 185, 129, 0.12)',
  warmBg: '#F5F0EB',
  sky: '#38BDF8',
  warm: '#F59E0B',
  lime: '#D4F940',
  green: '#10B981',
  teal: '#14B8A6',
  amber: '#F59E0B',
  blue: '#3B82F6',
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

const MF = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
} as const;

const { width, height } = Dimensions.get('window');

const breathingExercises = [
  {
    id: '1',
    title: 'Deep Breathing',
    duration: 5,
    description: 'Calm your mind with slow, deep breaths',
    bg: '#ECFDF5',
    tint: '#10B981',
    difficulty: 'Beginner',
    instructions: [
      'Breathe in slowly through your nose for 4 seconds',
      'Hold your breath for 2 seconds',
      'Exhale slowly through your mouth for 6 seconds',
      'Repeat until the timer ends',
    ],
  },
  {
    id: '2',
    title: 'Box Breathing',
    duration: 10,
    description: 'Balance your nervous system',
    bg: '#F5F0EB',
    tint: '#92400E',
    difficulty: 'Intermediate',
    instructions: [
      'Breathe in for 4 seconds',
      'Hold for 4 seconds',
      'Breathe out for 4 seconds',
      'Hold for 4 seconds',
      'Repeat the cycle',
    ],
  },
  {
    id: '3',
    title: '4-7-8 Technique',
    duration: 8,
    description: 'Reduce anxiety and promote sleep',
    bg: '#111111',
    tint: '#FFFFFF',
    difficulty: 'Advanced',
    instructions: [
      'Breathe in through your nose for 4 seconds',
      'Hold your breath for 7 seconds',
      'Exhale completely through your mouth for 8 seconds',
      'This completes one cycle',
    ],
  },
];

const meditationSessions = [
  {
    id: '1',
    title: 'Morning Focus',
    duration: 15,
    type: 'Guided',
    bg: '#FFFBEB',
    tint: '#D97706',
    description: 'Start your day with clarity and intention',
  },
  {
    id: '2',
    title: 'Stress Relief',
    duration: 10,
    type: 'Ambient',
    bg: '#ECFDF5',
    tint: '#059669',
    description: 'Release tension and find inner peace',
  },
  {
    id: '3',
    title: 'Sleep Meditation',
    duration: 20,
    type: 'Guided',
    bg: '#111111',
    tint: '#FFFFFF',
    description: 'Drift into restful sleep naturally',
  },
  {
    id: '4',
    title: 'Body Scan',
    duration: 12,
    type: 'Guided',
    bg: '#F5F0EB',
    tint: '#78350F',
    description: 'Connect with your physical sensations',
  },
];

const quickPractices = [
  {
    id: '1',
    title: 'One Minute Calm',
    duration: 1,
    bg: '#EFF6FF',
    tint: '#2563EB',
    description: 'Quick reset for busy moments',
  },
  {
    id: '2',
    title: 'Gratitude Moment',
    duration: 3,
    bg: '#FFF1F2',
    tint: '#E11D48',
    description: 'Appreciate the good in your life',
  },
  {
    id: '3',
    title: 'Body Check-in',
    duration: 2,
    bg: '#ECFDF5',
    tint: '#059669',
    description: 'Notice how you feel right now',
  },
];

const getBreathIcon = (id: string, size: number, color: string) => {
  switch (id) {
    case '1': return <Wind size={size} color={color} weight="duotone" />;
    case '2': return <Square size={size} color={color} weight="duotone" />;
    case '3': return <Moon size={size} color={color} weight="duotone" />;
    default: return <Wind size={size} color={color} weight="duotone" />;
  }
};

const getMeditationIcon = (id: string, size: number, color: string) => {
  switch (id) {
    case '1': return <Sun size={size} color={color} weight="duotone" />;
    case '2': return <FlowerLotus size={size} color={color} weight="duotone" />;
    case '3': return <MoonStars size={size} color={color} weight="duotone" />;
    case '4': return <PersonArmsSpread size={size} color={color} weight="duotone" />;
    default: return <FlowerLotus size={size} color={color} weight="duotone" />;
  }
};

const getQuickIcon = (id: string, size: number, color: string) => {
  switch (id) {
    case '1': return <Timer size={size} color={color} weight="duotone" />;
    case '2': return <Heart size={size} color={color} weight="duotone" />;
    case '3': return <Leaf size={size} color={color} weight="duotone" />;
    default: return <Timer size={size} color={color} weight="duotone" />;
  }
};

interface MindfulnessScreenProps {
  onNavigate?: (screen: string) => void;
  openStats?: boolean;
}

import { useAuth } from '../contexts/AuthContext';

export const MindfulnessScreen: React.FC<MindfulnessScreenProps> = ({ onNavigate, openStats }) => {
  const { currentMode } = useAuth();
  const MC = currentMode === 'coach' ? coachTheme : clientTheme;
  const S = React.useMemo(() => getStyles(MC), [currentMode]);

  const { sessions, stats, startSession: dbStartSession, completeSession, loading: sessionsLoading } = useMindfulnessSessions();
  const { moodLog, logMood, loading: moodLoading } = useMoodLogs();

  const [activeFilter, setActiveFilter] = useState<'breathe' | 'meditate' | 'quick'>('breathe');
  const [sessionActive, setSessionActive] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<'breathing' | 'meditation' | 'quick'>('breathing');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showStats, setShowStats] = useState(openStats || false);
  const [breathingPhase, setBreathingPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [selectedMood, setSelectedMood] = useState<'great' | 'good' | 'okay' | 'bad' | 'terrible' | null>(null);

  const completedSessions = stats?.totalSessions || 0;
  const totalMinutes = stats?.totalMinutes || 0;
  const currentStreak = stats?.currentStreak || 0;

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breathingLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBreathingActiveRef = useRef(false);
  const breathingAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (openStats) {
      setShowStats(true);
    }
  }, [openStats]);

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeFilter]);

  useEffect(() => {
    if (sessionActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleCompleteSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionActive, isPaused]);

  useEffect(() => {
    if (sessionActive && sessionType === 'breathing') {
      startBreathingAnimation();
    } else {
      isBreathingActiveRef.current = false;
      
      if (breathingAnimationRef.current) {
        breathingAnimationRef.current.stop();
        breathingAnimationRef.current = null;
      }
      
      if (breathingLoopRef.current) {
        clearTimeout(breathingLoopRef.current);
        breathingLoopRef.current = null;
      }
      
      breatheAnim.setValue(0);
      setBreathingPhase('in');
    }

    return () => {
      isBreathingActiveRef.current = false;
      
      if (breathingAnimationRef.current) {
        breathingAnimationRef.current.stop();
        breathingAnimationRef.current = null;
      }
      
      if (breathingLoopRef.current) {
        clearTimeout(breathingLoopRef.current);
        breathingLoopRef.current = null;
      }
    };
  }, [sessionActive, sessionType]);

  const startBreathingAnimation = () => {
    isBreathingActiveRef.current = false;
    
    if (breathingAnimationRef.current) {
      breathingAnimationRef.current.stop();
      breathingAnimationRef.current = null;
    }
    
    if (breathingLoopRef.current) {
      clearTimeout(breathingLoopRef.current);
      breathingLoopRef.current = null;
    }
    
    breatheAnim.setValue(0);
    setBreathingPhase('in');
    
    isBreathingActiveRef.current = true;
    
    const runBreathingCycle = () => {
      if (!isBreathingActiveRef.current) return;
      
      setBreathingPhase('in');
      
      const inhaleAnim = Animated.timing(breatheAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      });
      
      breathingAnimationRef.current = inhaleAnim;
      
      inhaleAnim.start(({ finished }) => {
        if (!finished || !isBreathingActiveRef.current) return;
        
        setBreathingPhase('out');
        
        const exhaleAnim = Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: true,
        });
        
        breathingAnimationRef.current = exhaleAnim;
        
        exhaleAnim.start(({ finished }) => {
          if (!finished || !isBreathingActiveRef.current) return;
          runBreathingCycle();
        });
      });
    };

    runBreathingCycle();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startSession = async (session: any, type: 'breathing' | 'meditation' | 'quick') => {
    setActiveSession(session);
    setSessionType(type);
    setTimeRemaining(session.duration * 60);
    setSessionActive(true);
    setIsPaused(false);

    let dbSessionType: 'breathing' | 'meditation' | 'body_scan' | 'visualization' = 'breathing';
    if (type === 'meditation') {
      dbSessionType = 'meditation';
    } else if (type === 'quick') {
      dbSessionType = 'breathing';
    } else {
      dbSessionType = 'breathing';
    }

    try {
      const result = await dbStartSession(dbSessionType, session.duration * 60);
      if (result.data) {
        setCurrentSessionId(result.data.id);
      } else if (result.error) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error starting session:', error);
      Alert.alert('Error', 'Failed to start session. Please try again.');
    }

    if (type === 'meditation' || type === 'quick') {
      startPulseAnimation();
    }
  };

  const pauseSession = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    if (sessionType === 'breathing') {
      if (newPausedState) {
        isBreathingActiveRef.current = false;
        
        if (breathingAnimationRef.current) {
          breathingAnimationRef.current.stop();
          breathingAnimationRef.current = null;
        }
        
        if (breathingLoopRef.current) {
          clearTimeout(breathingLoopRef.current);
          breathingLoopRef.current = null;
        }
      } else {
        startBreathingAnimation();
      }
    }
  };

  const stopSession = () => {
    isBreathingActiveRef.current = false;
    
    if (breathingAnimationRef.current) {
      breathingAnimationRef.current.stop();
      breathingAnimationRef.current = null;
    }
    
    if (breathingLoopRef.current) {
      clearTimeout(breathingLoopRef.current);
      breathingLoopRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setSessionActive(false);
    setActiveSession(null);
    setIsPaused(false);
    setBreathingPhase('in');
    breatheAnim.setValue(0);
    pulseAnim.setValue(1);
  };

  const handleCompleteSession = async () => {
    if (currentSessionId) {
      try {
        await completeSession(currentSessionId, undefined, undefined);
        setCurrentSessionId(null);
      } catch (error) {
        console.error('Error completing session:', error);
        Alert.alert('Error', 'Failed to save session. Please try again.');
      }
    }
    stopSession();
  };

  const handleMoodLog = async (mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible') => {
    if (!mood) {
      console.error('[MindfulnessScreen] No mood provided to handleMoodLog');
      Alert.alert('Error', 'Please select a mood first.');
      return;
    }

    if (!['great', 'good', 'okay', 'bad', 'terrible'].includes(mood)) {
      console.error('[MindfulnessScreen] Invalid mood provided:', mood);
      Alert.alert('Error', 'Invalid mood selection. Please try again.');
      return;
    }

    try {
      console.log('[MindfulnessScreen] Logging mood:', mood);
      const result = await logMood(mood);
      
      if (result && result.error) {
        console.error('[MindfulnessScreen] Mood logging failed:', result.error);
        setSelectedMood(null);
        
        if (result.error.includes('connection')) {
          Alert.alert(
            'Connection Error', 
            'Unable to connect to the server. Please check your internet connection and try again.',
            [{ text: 'OK', onPress: () => setSelectedMood(null) }]
          );
        } else if (result.error.includes('already logged')) {
          Alert.alert(
            'Already Logged', 
            'You have already logged your mood for today. Your mood has been updated.',
            [{ text: 'OK', onPress: () => {
              setShowMoodSelector(false);
              setSelectedMood(null);
            }}]
          );
        } else {
          Alert.alert(
            'Error', 
            result.error,
            [{ text: 'OK', onPress: () => setSelectedMood(null) }]
          );
        }
        return;
      }

      console.log('[MindfulnessScreen] Mood logged successfully');
      setShowMoodSelector(false);
      setSelectedMood(null);
    } catch (error: any) {
      console.error('[MindfulnessScreen] Unexpected error logging mood:', error);
      setSelectedMood(null);
      
      if (error.name === 'NetworkError') {
        Alert.alert(
          'Network Error', 
          'Unable to connect to the server. Please check your internet connection.',
          [{ text: 'OK' }]
        );
      } else if (error.message) {
        Alert.alert('Error', `Failed to log mood: ${error.message}`);
      } else {
        Alert.alert('Error', 'Failed to log mood. Please try again.');
      }
    }
  };

  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case 'great': return '🤩';
      case 'good': return '😊';
      case 'okay': return '🫤';
      case 'bad': return '😮‍💨';
      case 'terrible': return '🥺';
      default: return '🫤';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const breathScale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  const breathOpacity = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  const PAD = 20;

  const showBreathing = activeFilter === 'breathe';
  const showMeditation = activeFilter === 'meditate';
  const showQuick = activeFilter === 'quick';

  const weekGoal = 7;
  const weekPct = Math.min(Math.round((completedSessions / weekGoal) * 100), 100);

  return (
    <SafeAreaView style={S.container}>
      <ScrollView
        style={S.scrollView}
        contentContainerStyle={S.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER — compact like Nutrition ── */}
        <ReAnimated.View entering={FadeInDown.duration(600).springify()} style={S.header}>
          <View>
            <Text style={S.headerSub}>Mindfulness</Text>
            <Text style={S.headerTitle}>Find Your Peace</Text>
          </View>
          <TouchableOpacity style={S.headerBtn} onPress={() => setShowStats(true)}>
            <ChartLineUp size={20} color={MC.text} weight="bold" />
          </TouchableOpacity>
        </ReAnimated.View>

        {/* ── HERO — warm card with breathing circle + stats ── */}
        <ReAnimated.View entering={FadeInDown.delay(50).duration(600).springify()}>
          <TouchableOpacity
            style={S.heroCard}
            activeOpacity={0.9}
            onPress={() => startSession({ id: 'featured', title: 'Mindful Walking', duration: 15, type: 'Guided', description: 'Connect with movement and awareness' }, 'meditation')}
          >
            <View style={S.heroRow}>
              {/* Breathing ring */}
              <View style={S.heroRingWrap}>
                <Svg width={120} height={120}>
                  <Circle cx={60} cy={60} r={50} stroke="rgba(0,0,0,0.06)" strokeWidth={10} fill="none" />
                  <Circle cx={60} cy={60} r={50} stroke={MC.accent} strokeWidth={10} fill="none"
                    strokeDasharray={2 * Math.PI * 50}
                    strokeDashoffset={2 * Math.PI * 50 - (2 * Math.PI * 50 * weekPct) / 100}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </Svg>
                <View style={S.heroRingCenter}>
                  <FlowerLotus size={28} color={MC.accent} weight="duotone" />
                </View>
              </View>

              {/* Stats beside ring */}
              <View style={S.heroInfo}>
                <Text style={S.heroLabel}>WEEKLY PROGRESS</Text>
                <Text style={S.heroVal}>
                  {sessionsLoading ? '–' : completedSessions}
                  <Text style={S.heroValUnit}> / {weekGoal}</Text>
                </Text>
                <View style={S.heroRemaining}>
                  <View style={S.heroRemDot} />
                  <Text style={S.heroRemText}>
                    {sessionsLoading ? '...' : `${totalMinutes} min this week`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Mini stat strip */}
            <View style={S.heroStrip}>
              <View style={S.heroStripItem}>
                <Text style={S.heroStripVal}>{sessionsLoading ? '–' : completedSessions}</Text>
                <Text style={S.heroStripLabel}>sessions</Text>
              </View>
              <View style={S.heroStripDiv} />
              <View style={S.heroStripItem}>
                <Text style={S.heroStripVal}>{sessionsLoading ? '–' : totalMinutes}</Text>
                <Text style={S.heroStripLabel}>minutes</Text>
              </View>
              <View style={S.heroStripDiv} />
              <View style={S.heroStripItem}>
                <Text style={S.heroStripVal}>{sessionsLoading ? '–' : currentStreak}</Text>
                <Text style={S.heroStripLabel}>streak</Text>
              </View>
            </View>
          </TouchableOpacity>
        </ReAnimated.View>

        {/* ── MOOD — white card like Nutrition water ── */}
        <ReAnimated.View entering={FadeInDown.delay(100).duration(500).springify()}>
          <View style={S.moodCard}>
            <View style={S.moodTop}>
              <View style={S.moodLeft}>
                <View style={S.moodIconBadge}>
                  <Smiley size={20} color="#F59E0B" weight="fill" />
                </View>
                <View>
                  <Text style={S.moodTitle}>Mood</Text>
                  <Text style={S.moodSub}>
                    {moodLoading ? 'Loading...' : moodLog ? `Feeling ${moodLog.mood}` : 'How are you today?'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={S.moodRow}>
              {(['great', 'good', 'okay', 'bad', 'terrible'] as const).map((mood) => (
                <TouchableOpacity
                  key={mood}
                  style={[S.moodDot, moodLog?.mood === mood && S.moodDotActive]}
                  onPress={() => { setSelectedMood(mood); setShowMoodSelector(true); }}
                >
                  <Text style={S.moodEmoji}>{getMoodEmoji(mood)}</Text>
                  <Text style={[S.moodDotLabel, moodLog?.mood === mood && S.moodDotLabelActive]}>
                    {mood.charAt(0).toUpperCase() + mood.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ReAnimated.View>

        {/* ── TAB BAR ── */}
        <ReAnimated.View entering={FadeInDown.delay(120).duration(500).springify()}>
          <View style={S.tabBar}>
            {([
              { key: 'breathe' as const, label: 'Breathing', icon: <Wind size={16} color={activeFilter === 'breathe' ? '#FFF' : MC.textDim} weight="bold" /> },
              { key: 'meditate' as const, label: 'Meditate', icon: <FlowerLotus size={16} color={activeFilter === 'meditate' ? '#FFF' : MC.textDim} weight="bold" /> },
              { key: 'quick' as const, label: 'Quick', icon: <Timer size={16} color={activeFilter === 'quick' ? '#FFF' : MC.textDim} weight="bold" /> },
            ]).map((tab) => {
              const active = activeFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[S.tab, active && S.tabActive]}
                  onPress={() => setActiveFilter(tab.key)}
                  activeOpacity={0.7}
                >
                  {tab.icon}
                  <Text style={[S.tabText, active && S.tabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ReAnimated.View>

        {/* ── BREATHING section ── */}
        {showBreathing && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {breathingExercises.map((ex) => {
              const isDark = ex.bg === '#111111';
              return (
                <TouchableOpacity
                  key={`b-${ex.id}`}
                  style={[S.exCard, { backgroundColor: ex.bg }]}
                  activeOpacity={0.85}
                  onPress={() => startSession(ex, 'breathing')}
                >
                  <View style={[S.exIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : `${ex.tint}18` }]}>
                    {getBreathIcon(ex.id, 22, ex.tint)}
                  </View>
                  <View style={S.exInfo}>
                    <Text style={[S.exTitle, { color: isDark ? '#FFF' : MC.text }]}>{ex.title}</Text>
                    <Text style={[S.exDesc, { color: isDark ? 'rgba(255,255,255,0.5)' : MC.textDim }]}>{ex.description}</Text>
                    <View style={S.exMeta}>
                      <View style={[S.exPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <Clock size={12} color={isDark ? 'rgba(255,255,255,0.4)' : MC.textDim} />
                        <Text style={[S.exPillText, { color: isDark ? 'rgba(255,255,255,0.5)' : MC.textDim }]}>{ex.duration} min</Text>
                      </View>
                      <View style={[S.exPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[S.exPillText, { color: isDark ? 'rgba(255,255,255,0.5)' : MC.textDim }]}>{ex.difficulty}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[S.exPlayBtn, { backgroundColor: isDark ? MC.lime : ex.tint }]}>
                    <Play size={16} color={isDark ? MC.text : '#FFF'} weight="fill" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* ── MEDITATION section ── */}
        {showMeditation && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {meditationSessions.map((s) => {
              const isDark = s.bg === '#111111';
              return (
                <TouchableOpacity
                  key={`m-${s.id}`}
                  style={[S.exCard, { backgroundColor: s.bg }]}
                  activeOpacity={0.85}
                  onPress={() => startSession(s, 'meditation')}
                >
                  <View style={[S.exIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : `${s.tint}18` }]}>
                    {getMeditationIcon(s.id, 22, s.tint)}
                  </View>
                  <View style={S.exInfo}>
                    <Text style={[S.exTitle, { color: isDark ? '#FFF' : MC.text }]}>{s.title}</Text>
                    <Text style={[S.exDesc, { color: isDark ? 'rgba(255,255,255,0.5)' : MC.textDim }]}>{s.description}</Text>
                    <View style={S.exMeta}>
                      <View style={[S.exPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <Clock size={12} color={isDark ? 'rgba(255,255,255,0.4)' : MC.textDim} />
                        <Text style={[S.exPillText, { color: isDark ? 'rgba(255,255,255,0.5)' : MC.textDim }]}>{s.duration} min</Text>
                      </View>
                      <View style={[S.exPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[S.exPillText, { color: isDark ? 'rgba(255,255,255,0.5)' : MC.textDim }]}>{s.type}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[S.exPlayBtn, { backgroundColor: isDark ? MC.lime : s.tint }]}>
                    <Play size={16} color={isDark ? MC.text : '#FFF'} weight="fill" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* ── QUICK section ── */}
        {showQuick && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {quickPractices.map((p) => (
              <TouchableOpacity
                key={`q-${p.id}`}
                style={[S.exCard, { backgroundColor: p.bg }]}
                activeOpacity={0.85}
                onPress={() => startSession(p, 'quick')}
              >
                <View style={[S.exIconBox, { backgroundColor: `${p.tint}18` }]}>
                  {getQuickIcon(p.id, 22, p.tint)}
                </View>
                <View style={S.exInfo}>
                  <Text style={S.exTitle}>{p.title}</Text>
                  <Text style={[S.exDesc, { color: MC.textDim }]}>{p.description}</Text>
                  <View style={S.exMeta}>
                    <View style={[S.exPill, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                      <Clock size={12} color={MC.textDim} />
                      <Text style={[S.exPillText, { color: MC.textDim }]}>{p.duration} min</Text>
                    </View>
                  </View>
                </View>
                <View style={[S.exPlayBtn, { backgroundColor: p.tint }]}>
                  <Play size={16} color="#FFF" weight="fill" />
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Session Modal */}
      <Modal
        visible={sessionActive}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={S.sessModal}>
          <SafeAreaView style={S.sessSafe}>
            {/* Top bar */}
            <View style={S.sessTopBar}>
              <TouchableOpacity onPress={stopSession} style={S.sessBackBtn}>
                <X size={20} color="#FFF" weight="bold" />
              </TouchableOpacity>
              <View style={S.sessTopCenter}>
                <Text style={S.sessTopLabel}>{activeSession?.title}</Text>
                <View style={S.sessProgressTrack}>
                  <View style={[S.sessProgressFill, { width: `${activeSession?.duration ? ((activeSession.duration * 60 - timeRemaining) / (activeSession.duration * 60)) * 100 : 0}%` }]} />
                </View>
              </View>
              <TouchableOpacity onPress={pauseSession} style={S.sessPauseBtn}>
                {isPaused
                  ? <Play size={18} color={MC.cardDark} weight="fill" />
                  : <Pause size={18} color={MC.cardDark} weight="fill" />
                }
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={S.sessScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={S.sessBody}>
                {sessionType === 'breathing' && (
                  <View style={S.breathAnimContainer}>
                    <Animated.View
                      style={[
                        S.breathAnimCircle,
                        {
                          transform: [{ scale: breathScale }],
                          opacity: breathOpacity,
                        },
                      ]}
                    >
                      <View style={S.breathAnimInner}>
                        <Wind size={48} color={MC.cardDark} weight="duotone" />
                      </View>
                    </Animated.View>

                    <Text style={S.breathPhaseText}>
                      {breathingPhase === 'in' ? 'Breathe In' : breathingPhase === 'hold' ? 'Hold' : 'Breathe Out'}
                    </Text>
                    <Text style={S.breathPhaseSub}>
                      {breathingPhase === 'in' ? 'Slowly through your nose' : breathingPhase === 'hold' ? 'Keep your lungs full' : 'Gently through your mouth'}
                    </Text>
                  </View>
                )}

                {(sessionType === 'meditation' || sessionType === 'quick') && (
                  <View style={S.meditAnimContainer}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                      <View style={S.meditOrb}>
                        <View style={S.meditOrbMid}>
                          <View style={S.meditOrbCore}>
                            <FlowerLotus size={36} color={MC.cardDark} weight="duotone" />
                          </View>
                        </View>
                      </View>
                    </Animated.View>

                    <Text style={S.meditFocusText}>
                      {activeSession?.description || 'Focus on your breath'}
                    </Text>
                  </View>
                )}

                {/* Timer */}
                <View style={S.timerBox}>
                  <Text style={S.timerText}>{formatTime(timeRemaining)}</Text>
                  <Text style={S.timerLabel}>remaining</Text>
                </View>

                {/* Instructions (for breathing) */}
                {sessionType === 'breathing' && activeSession?.instructions && (
                  <View style={S.instrCard}>
                    <Text style={S.instrTitle}>How to</Text>
                    {activeSession.instructions.map((instruction: string, index: number) => (
                      <View key={index} style={S.instrRow}>
                        <View style={S.instrNum}>
                          <Text style={S.instrNumText}>{index + 1}</Text>
                        </View>
                        <Text style={S.instrText}>{instruction}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Bottom controls */}
            <View style={S.sessBottomBar}>
              <TouchableOpacity style={S.ctrlBtnPause} onPress={pauseSession}>
                {isPaused
                  ? <Play size={22} color={MC.cardDark} weight="fill" />
                  : <Pause size={22} color={MC.cardDark} weight="fill" />
                }
                <Text style={S.ctrlBtnPauseText}>{isPaused ? 'Resume' : 'Pause'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.ctrlBtnEnd} onPress={stopSession}>
                <Stop size={22} color="#FFF" weight="fill" />
                <Text style={S.ctrlBtnEndText}>End</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Stats Modal */}
      <Modal
        visible={showStats}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStats(false)}
      >
        <View style={S.overlay}>
          <TouchableOpacity
            style={S.overlayBg}
            activeOpacity={1}
            onPress={() => setShowStats(false)}
          />
          <View style={S.sheet}>
            <View style={S.sheetHandle} />
            <View style={S.sheetHead}>
              <Text style={S.sheetTitle}>Your Progress</Text>
              <TouchableOpacity onPress={() => setShowStats(false)} style={S.sheetCloseX}>
                <X size={18} color={MC.textDim} weight="bold" />
              </TouchableOpacity>
            </View>

            {/* Hero stat */}
            <View style={S.progressHero}>
              <View style={S.progressHeroIcon}>
                <Leaf size={28} color={MC.cardDark} weight="fill" />
              </View>
              <Text style={S.progressHeroNum}>{sessionsLoading ? '...' : completedSessions}</Text>
              <Text style={S.progressHeroLabel}>Total Sessions</Text>
              <View style={S.progressHeroBar}>
                <View style={[S.progressHeroFill, { width: `${Math.min(100, (completedSessions / 50) * 100)}%` }]} />
              </View>
              <Text style={S.progressHeroGoal}>Goal: 50 sessions</Text>
            </View>

            {/* Stat rows */}
            <View style={S.progressRows}>
              {[
                { icon: <Clock size={22} color={MC.lime} weight="bold" />, value: sessionsLoading ? '...' : totalMinutes, label: 'Minutes Practiced', suffix: 'min' },
                { icon: <Fire size={22} color={MC.amber} weight="fill" />, value: sessionsLoading ? '...' : currentStreak, label: 'Day Streak', suffix: 'days' },
                { icon: <Trophy size={22} color={MC.blue} weight="fill" />, value: sessionsLoading ? '...' : Math.floor(completedSessions / 5), label: 'Achievements Earned', suffix: '' },
              ].map((s, i) => (
                <View key={i} style={S.progressRow}>
                  <View style={S.progressRowIcon}>{s.icon}</View>
                  <View style={S.progressRowInfo}>
                    <Text style={S.progressRowLabel}>{s.label}</Text>
                  </View>
                  <Text style={S.progressRowValue}>{s.value}<Text style={S.progressRowSuffix}> {s.suffix}</Text></Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={S.sheetCloseBtn} onPress={() => setShowStats(false)}>
              <Text style={S.sheetCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Mood Selector Modal */}
      <Modal
        visible={showMoodSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMoodSelector(false)}
      >
        <View style={S.overlay}>
          <TouchableOpacity
            style={S.overlayBg}
            activeOpacity={1}
            onPress={() => {
              setSelectedMood(null);
              setShowMoodSelector(false);
            }}
          />
          <View style={S.sheet}>
            <View style={S.sheetHandle} />
            <View style={S.sheetHead}>
              <Text style={S.sheetTitle}>How are you feeling?</Text>
              <TouchableOpacity onPress={() => { setSelectedMood(null); setShowMoodSelector(false); }} style={S.sheetCloseX}>
                <X size={18} color={MC.textDim} weight="bold" />
              </TouchableOpacity>
            </View>

            <View style={S.moodGrid}>
              {(['great', 'good', 'okay', 'bad', 'terrible'] as const).map((mood) => {
                const selected = selectedMood === mood;
                const moodColors: Record<string, string> = { great: MC.lime, good: MC.accent, okay: MC.amber, bad: '#F97316', terrible: '#EF4444' };
                return (
                  <TouchableOpacity
                    key={mood}
                    style={[S.moodSelCard, selected && { backgroundColor: MC.cardDark }]}
                    onPress={() => setSelectedMood(mood)}
                  >
                    <Text style={S.moodCardEmoji}>{getMoodEmoji(mood)}</Text>
                    <Text style={[S.moodCardText, selected && { color: '#FFF' }]}>
                      {mood.charAt(0).toUpperCase() + mood.slice(1)}
                    </Text>
                    <View style={[S.moodSelDot, { backgroundColor: selected ? moodColors[mood] : MC.border }]} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedMood ? (
              <TouchableOpacity
                style={S.moodConfirmBtn}
                onPress={() => handleMoodLog(selectedMood)}
              >
                <Text style={S.moodConfirmText}>Log Mood</Text>
              </TouchableOpacity>
            ) : (
              <View style={S.moodPrompt}>
                <Text style={S.moodPromptText}>Tap how you feel</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const PAD_H = 20;

const getStyles = (MC: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.bg },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 110 },

  /* Header — compact like Nutrition */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PAD_H,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerSub: { fontFamily: MF.medium, fontSize: 13, color: MC.textDim, marginBottom: 2 },
  headerTitle: { fontFamily: MF.bold, fontSize: 22, color: MC.text, letterSpacing: -0.5 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center', alignItems: 'center',
  },

  /* Hero card — warm beige with ring like Nutrition calorie hero */
  heroCard: {
    backgroundColor: MC.warmBg,
    marginHorizontal: PAD_H,
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroRingWrap: { position: 'relative' as const },
  heroRingCenter: {
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  heroInfo: { flex: 1, marginLeft: 24 },
  heroLabel: {
    fontFamily: MF.medium, fontSize: 11, color: MC.textDim,
    textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 2,
  },
  heroVal: { fontFamily: MF.bold, fontSize: 28, color: MC.text, letterSpacing: -0.5, marginBottom: 10 },
  heroValUnit: { fontFamily: MF.regular, fontSize: 16, color: MC.textDim },
  heroRemaining: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: MC.accent + '14',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, alignSelf: 'flex-start' as const,
  },
  heroRemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: MC.accent },
  heroRemText: { fontFamily: MF.semi, fontSize: 12, color: MC.accent },

  heroStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 8,
  },
  heroStripItem: { alignItems: 'center', gap: 3 },
  heroStripVal: { fontFamily: MF.bold, fontSize: 16, color: MC.text },
  heroStripLabel: { fontFamily: MF.medium, fontSize: 11, color: MC.textDim },
  heroStripDiv: { width: 1, height: 28, backgroundColor: 'rgba(0,0,0,0.08)' },

  /* Mood card — white card like Nutrition water */
  moodCard: {
    backgroundColor: MC.card,
    marginHorizontal: PAD_H,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  moodTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  moodLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moodIconBadge: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: '#F59E0B' + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  moodTitle: { fontFamily: MF.bold, fontSize: 17, color: MC.text, letterSpacing: -0.3 },
  moodSub: { fontFamily: MF.medium, fontSize: 12, color: MC.textDim, marginTop: 1 },
  moodRow: {
    flexDirection: 'row', justifyContent: 'space-between',
  },
  moodDot: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 16,
    backgroundColor: '#F8F8F8',
    marginHorizontal: 3,
  },
  moodDotActive: { backgroundColor: MC.accent + '15' },
  moodEmoji: { fontSize: 24, marginBottom: 4 },
  moodDotLabel: { fontFamily: MF.medium, fontSize: 10, color: MC.textDim },
  moodDotLabelActive: { color: MC.accent, fontFamily: MF.semi },

  /* Tab Bar */
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: PAD_H,
    marginBottom: 16,
    marginTop: 4,
    backgroundColor: '#F2F2F2',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 13,
  },
  tabActive: {
    backgroundColor: MC.cardDark,
  },
  tabText: {
    fontFamily: MF.semi,
    fontSize: 13,
    color: MC.textDim,
  },
  tabTextActive: {
    color: '#FFF',
  },

  /* Section headers */
  secHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: PAD_H, marginBottom: 12, marginTop: 8,
  },
  secHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secIconBadge: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  secTitle: { fontFamily: MF.bold, fontSize: 20, color: MC.text, letterSpacing: -0.5 },

  /* Exercise cards — vertical row cards like Nutrition meal cards */
  exCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: PAD_H, marginBottom: 10,
    borderRadius: 20, padding: 16,
  },
  exIconBox: {
    width: 48, height: 48, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  exInfo: { flex: 1, marginLeft: 14 },
  exTitle: { fontFamily: MF.bold, fontSize: 15, color: MC.text, letterSpacing: -0.3 },
  exDesc: { fontFamily: MF.regular, fontSize: 12, color: MC.textDim, marginTop: 2 },
  exMeta: { flexDirection: 'row', gap: 6, marginTop: 6 },
  exPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  exPillText: { fontFamily: MF.medium, fontSize: 11 },
  exPlayBtn: {
    width: 40, height: 40, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 10,
  },

  /* Session Modal */
  sessModal: { flex: 1, backgroundColor: MC.cardDark },
  sessSafe: { flex: 1 },
  sessScroll: { flexGrow: 1, paddingBottom: 120 },

  /* Top bar */
  sessTopBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, gap: 14,
  },
  sessBackBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  sessTopCenter: { flex: 1 },
  sessTopLabel: {
    fontSize: 14, color: 'rgba(255,255,255,0.7)', fontFamily: MF.semi,
    marginBottom: 6,
  },
  sessProgressTrack: {
    height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden' as const,
  },
  sessProgressFill: {
    height: 4, borderRadius: 2, backgroundColor: MC.lime,
  },
  sessPauseBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: MC.lime,
    justifyContent: 'center', alignItems: 'center',
  },

  sessBody: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 20, width: '100%',
  },

  /* Breathing Animation */
  breathAnimContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  breathAnimCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(212, 249, 64, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  breathAnimInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(212, 249, 64, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathPhaseText: {
    fontSize: 30,
    color: '#FFF',
    fontFamily: MF.bold,
    marginBottom: 6,
    textAlign: 'center',
  },
  breathPhaseSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: MF.medium,
    textAlign: 'center',
    marginBottom: 8,
  },

  /* Instruction card */
  instrCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20,
    padding: 20, marginTop: 20, width: '100%',
  },
  instrTitle: {
    fontSize: 15, color: 'rgba(255,255,255,0.5)', fontFamily: MF.semi,
    marginBottom: 14, textTransform: 'uppercase' as const, letterSpacing: 1,
  },
  instrRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  instrNum: {
    width: 26, height: 26, borderRadius: 9,
    backgroundColor: MC.lime + '20',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  instrNumText: { fontSize: 12, color: MC.lime, fontFamily: MF.bold },
  instrText: {
    fontSize: 14, color: 'rgba(255,255,255,0.8)', fontFamily: MF.medium,
    flex: 1, lineHeight: 20,
  },

  /* Meditation Animation */
  meditAnimContainer: { alignItems: 'center', marginBottom: 20 },
  meditOrb: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: MC.accent + '18',
    justifyContent: 'center', alignItems: 'center',
  },
  meditOrbMid: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: MC.accent + '30',
    justifyContent: 'center', alignItems: 'center',
  },
  meditOrbCore: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: MC.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  meditFocusText: {
    fontSize: 17, color: 'rgba(255,255,255,0.7)', fontFamily: MF.semi,
    textAlign: 'center', marginTop: 28, paddingHorizontal: 24, lineHeight: 24,
  },

  /* Timer */
  timerBox: { alignItems: 'center', marginBottom: 8, marginTop: 24 },
  timerText: {
    fontSize: 56, color: '#FFF', fontFamily: MF.bold, letterSpacing: -2,
  },
  timerLabel: {
    fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: MF.medium,
    textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 4,
  },

  /* Bottom controls */
  sessBottomBar: {
    position: 'absolute' as const, bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12, paddingHorizontal: 20,
    paddingBottom: 40, paddingTop: 16,
    backgroundColor: MC.cardDark,
  },
  ctrlBtnPause: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: MC.lime, paddingVertical: 16, borderRadius: 16,
  },
  ctrlBtnPauseText: { fontSize: 15, color: MC.cardDark, fontFamily: MF.bold },
  ctrlBtnEnd: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 16, paddingHorizontal: 28, borderRadius: 16,
  },
  ctrlBtnEndText: { fontSize: 15, color: '#FFF', fontFamily: MF.semi },

  /* Shared Overlay & Bottom Sheet */
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: MC.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12, maxHeight: '85%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: MC.border, alignSelf: 'center', marginBottom: 16,
  },
  sheetHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 22, color: MC.text, fontFamily: MF.bold },
  sheetCloseX: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: MC.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Progress Hero */
  progressHero: {
    backgroundColor: MC.cardDark, borderRadius: 24, padding: 28,
    alignItems: 'center', marginBottom: 16,
  },
  progressHeroIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: MC.lime,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  progressHeroNum: { fontSize: 48, color: '#FFF', fontFamily: MF.bold },
  progressHeroLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: MF.medium, marginTop: 2 },
  progressHeroBar: {
    width: '100%', height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 18,
  },
  progressHeroFill: {
    height: 6, borderRadius: 3, backgroundColor: MC.lime,
  },
  progressHeroGoal: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: MF.medium, marginTop: 8 },

  /* Progress Rows */
  progressRows: { gap: 10, marginBottom: 20 },
  progressRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: MC.surfaceMuted,
    borderRadius: 16, padding: 16, gap: 14,
  },
  progressRowIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: MC.cardDark,
    alignItems: 'center', justifyContent: 'center',
  },
  progressRowInfo: { flex: 1 },
  progressRowLabel: { fontSize: 14, color: MC.text, fontFamily: MF.medium },
  progressRowValue: { fontSize: 20, color: MC.text, fontFamily: MF.bold },
  progressRowSuffix: { fontSize: 13, color: MC.textDim, fontFamily: MF.medium },

  sheetCloseBtn: {
    backgroundColor: MC.cardDark, paddingVertical: 16, borderRadius: 16,
    alignItems: 'center',
  },
  sheetCloseBtnText: { fontSize: 15, color: '#FFF', fontFamily: MF.semi },

  /* Mood Selector */
  moodGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    gap: 10, marginBottom: 8,
  },
  moodSelCard: {
    width: '47%', backgroundColor: MC.surfaceMuted, borderRadius: 20,
    padding: 18, alignItems: 'center', gap: 6,
  },
  moodCardEmoji: { fontSize: 36 },
  moodCardText: { fontSize: 14, fontFamily: MF.semi, color: MC.text },
  moodSelDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  moodConfirmBtn: {
    marginTop: 14, padding: 16, backgroundColor: MC.cardDark,
    borderRadius: 16, alignItems: 'center',
  },
  moodConfirmText: { fontSize: 15, color: '#FFF', fontFamily: MF.semi },
  moodPrompt: { marginTop: 14, padding: 16, alignItems: 'center' },
  moodPromptText: { fontSize: 13, color: MC.textDim, fontFamily: MF.medium },
});
