import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import {
  BottomNavigation,
  BackgroundDecorations,
} from '../components';
import { colors, spacing, fontSizes, borderRadius, shadows, gradients } from '../constants/theme';
import { useMindfulnessSessions, useMoodLogs } from '../hooks';

const { width, height } = Dimensions.get('window');

const breathingExercises = [
  {
    id: '1',
    title: 'Deep Breathing',
    duration: 5,
    description: 'Calm your mind with slow, deep breaths',
    icon: 'air' as const,
    gradient: gradients.primary,
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
    icon: 'crop-square' as const,
    gradient: gradients.secondary,
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
    icon: 'bedtime' as const,
    gradient: gradients.purple,
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
    icon: 'wb-sunny' as const,
    color: colors.primary,
    description: 'Start your day with clarity and intention',
  },
  {
    id: '2',
    title: 'Stress Relief',
    duration: 10,
    type: 'Ambient',
    icon: 'spa' as const,
    color: colors.secondary,
    description: 'Release tension and find inner peace',
  },
  {
    id: '3',
    title: 'Sleep Meditation',
    duration: 20,
    type: 'Guided',
    icon: 'nightlight' as const,
    color: colors.purple,
    description: 'Drift into restful sleep naturally',
  },
  {
    id: '4',
    title: 'Body Scan',
    duration: 12,
    type: 'Guided',
    icon: 'accessibility-new' as const,
    color: colors.accent,
    description: 'Connect with your physical sensations',
  },
];

const quickPractices = [
  { 
    id: '1', 
    title: 'One Minute Calm', 
    duration: 1, 
    icon: 'timer' as const,
    description: 'Quick reset for busy moments',
  },
  { 
    id: '2', 
    title: 'Gratitude Moment', 
    duration: 3, 
    icon: 'favorite' as const,
    description: 'Appreciate the good in your life',
  },
  { 
    id: '3', 
    title: 'Body Check-in', 
    duration: 2, 
    icon: 'self-improvement' as const,
    description: 'Notice how you feel right now',
  },
];

interface MindfulnessScreenProps {
  onNavigate?: (screen: string) => void;
  openStats?: boolean;
}

export const MindfulnessScreen: React.FC<MindfulnessScreenProps> = ({ onNavigate, openStats }) => {
  const { sessions, stats, startSession: dbStartSession, completeSession, loading: sessionsLoading } = useMindfulnessSessions();
  const { moodLog, logMood, loading: moodLoading } = useMoodLogs();

  const [activeTab, setActiveTab] = useState<'breathe' | 'meditate' | 'quick'>('breathe');
  const [sessionActive, setSessionActive] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<'breathing' | 'meditation' | 'quick'>('breathing');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showStats, setShowStats] = useState(openStats || false);
  const [breathingPhase, setBreathingPhase] = useState<'in' | 'out'>('in');
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [selectedMood, setSelectedMood] = useState<'great' | 'good' | 'okay' | 'bad' | 'terrible' | null>(null);

  const completedSessions = stats?.totalSessions || 0;
  const totalMinutes = stats?.totalMinutes || 0;
  const currentStreak = stats?.currentStreak || 0;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
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
        useNativeDriver: false,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: false,
      }),
    ]).start();
  }, [activeTab]);

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
      if (!isBreathingActiveRef.current) {
        return;
      }
      
      setBreathingPhase('in');
      
      const inhaleAnim = Animated.timing(breatheAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: false,
      });
      
      breathingAnimationRef.current = inhaleAnim;
      
      inhaleAnim.start(({ finished }) => {
        if (!finished || !isBreathingActiveRef.current) {
          return;
        }
        
        setBreathingPhase('out');
        
        const exhaleAnim = Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: false,
        });
        
        breathingAnimationRef.current = exhaleAnim;
        
        exhaleAnim.start(({ finished }) => {
          if (!finished || !isBreathingActiveRef.current) {
            return;
          }
          
          breathingLoopRef.current = setTimeout(() => {
            if (isBreathingActiveRef.current) {
              runBreathingCycle();
            }
          }, 100);
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
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
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
      case 'great': return '😄';
      case 'good': return '🙂';
      case 'okay': return '😐';
      case 'bad': return '😔';
      case 'terrible': return '😢';
      default: return '😐';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const breathScale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const breathOpacity = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.subtitle}>Find Your Peace</Text>
            <Text style={styles.title}>Mindfulness</Text>
          </View>
          <TouchableOpacity 
            style={styles.statsButton}
            onPress={() => setShowStats(true)}
          >
            <MaterialIcons name="insights" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.moodCard, shadows.sm]}>
          <View style={styles.moodCardHeader}>
            <MaterialIcons name="emoji-emotions" size={24} color={colors.primary} />
            <Text style={styles.moodCardTitle}>How are you feeling today?</Text>
          </View>
          {moodLoading ? (
            <Text style={styles.moodLoggedText}>Loading...</Text>
          ) : moodLog ? (
            <View style={styles.moodLoggedContainer}>
              <Text style={styles.moodLoggedText}>
                Today's mood: <Text style={styles.moodLoggedEmoji}>{getMoodEmoji(moodLog.mood)}</Text>
              </Text>
              <TouchableOpacity onPress={() => {
                setSelectedMood(null);
                setShowMoodSelector(true);
              }}>
                <Text style={styles.changeMoodText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.logMoodButton, shadows.sm]}
              onPress={() => {
                setSelectedMood(null);
                setShowMoodSelector(true);
              }}
            >
              <Text style={styles.logMoodButtonText}>Log Your Mood</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'breathe' && styles.activeTab]}
            onPress={() => setActiveTab('breathe')}
          >
            <Text style={[styles.tabText, activeTab === 'breathe' && styles.activeTabText]}>
              Breathe
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'meditate' && styles.activeTab]}
            onPress={() => setActiveTab('meditate')}
          >
            <Text style={[styles.tabText, activeTab === 'meditate' && styles.activeTabText]}>
              Meditate
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'quick' && styles.activeTab]}
            onPress={() => setActiveTab('quick')}
          >
            <Text style={[styles.tabText, activeTab === 'quick' && styles.activeTabText]}>
              Quick
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'breathe' && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Breathing Exercises</Text>
              <Text style={styles.sectionSubtitle}>Regulate your breath, calm your mind</Text>

              {breathingExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={[styles.exerciseCard, shadows.md]}
                  activeOpacity={0.9}
                  onPress={() => startSession(exercise, 'breathing')}
                >
                  <LinearGradient
                    colors={exercise.gradient as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.exerciseGradient}
                  >
                    <View style={styles.exerciseContent}>
                      <View style={styles.exerciseLeft}>
                        <View style={styles.exerciseIconContainer}>
                          <MaterialIcons name={exercise.icon} size={32} color={colors.textLight} />
                        </View>
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseTitle}>{exercise.title}</Text>
                          <Text style={styles.exerciseDescription}>{exercise.description}</Text>
                          <View style={styles.exerciseMeta}>
                            <View style={styles.metaItem}>
                              <MaterialIcons name="schedule" size={14} color={colors.textLight} />
                              <Text style={styles.metaText}>{exercise.duration} min</Text>
                            </View>
                            <View style={styles.metaBadge}>
                              <Text style={styles.metaBadgeText}>{exercise.difficulty}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={styles.playButton}
                        onPress={() => startSession(exercise, 'breathing')}
                      >
                        <MaterialIcons name="play-arrow" size={28} color={colors.textLight} />
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>Breathing Tips</Text>
              <View style={styles.tipCard}>
                <MaterialIcons name="lightbulb-outline" size={20} color={colors.primary} />
                <Text style={styles.tipText}>
                  Find a quiet space where you won't be disturbed
                </Text>
              </View>
              <View style={styles.tipCard}>
                <MaterialIcons name="lightbulb-outline" size={20} color={colors.primary} />
                <Text style={styles.tipText}>
                  Breathe through your nose, out through your mouth
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {activeTab === 'meditate' && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Meditation Sessions</Text>
              <Text style={styles.sectionSubtitle}>Guided journeys for inner peace</Text>

              <View style={styles.sessionGrid}>
                {meditationSessions.map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    style={[styles.sessionCard, shadows.sm]}
                    activeOpacity={0.9}
                    onPress={() => startSession(session, 'meditation')}
                  >
                    <View style={[styles.sessionIconContainer, { backgroundColor: `${session.color}20` }]}>
                      <MaterialIcons name={session.icon} size={32} color={session.color} />
                    </View>
                    <Text style={styles.sessionTitle} numberOfLines={2}>{session.title}</Text>
                    <Text style={styles.sessionType}>{session.type}</Text>
                    <View style={styles.sessionFooter}>
                      <View style={styles.sessionDuration}>
                        <MaterialIcons name="schedule" size={14} color={colors.textSecondary} />
                        <Text style={styles.sessionDurationText}>{session.duration} min</Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.sessionPlayButton, { backgroundColor: session.color }]}
                        onPress={() => startSession(session, 'meditation')}
                      >
                        <MaterialIcons name="play-arrow" size={18} color={colors.textLight} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Relaxing Songs</Text>
              <Text style={styles.sectionSubtitle}>Soothing sounds to calm your mind</Text>

              <View style={styles.songsGrid}>
                <TouchableOpacity style={[styles.songCard, shadows.sm]} activeOpacity={0.8}>
                  <View style={[styles.songIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                    <MaterialIcons name="music-note" size={32} color={colors.primary} />
                  </View>
                  <View style={styles.songInfo}>
                    <Text style={styles.songTitle}>Ocean Waves</Text>
                    <Text style={styles.songArtist}>Nature Sounds · 15 min</Text>
                  </View>
                  <TouchableOpacity style={styles.songPlayIcon}>
                    <MaterialIcons name="play-circle-filled" size={36} color={colors.primary} />
                  </TouchableOpacity>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.songCard, shadows.sm]} activeOpacity={0.8}>
                  <View style={[styles.songIconContainer, { backgroundColor: `${colors.secondary}15` }]}>
                    <MaterialIcons name="music-note" size={32} color={colors.secondary} />
                  </View>
                  <View style={styles.songInfo}>
                    <Text style={styles.songTitle}>Forest Rain</Text>
                    <Text style={styles.songArtist}>Ambient Nature · 20 min</Text>
                  </View>
                  <TouchableOpacity style={styles.songPlayIcon}>
                    <MaterialIcons name="play-circle-filled" size={36} color={colors.secondary} />
                  </TouchableOpacity>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.songCard, shadows.sm]} activeOpacity={0.8}>
                  <View style={[styles.songIconContainer, { backgroundColor: `${colors.purple}15` }]}>
                    <MaterialIcons name="music-note" size={32} color={colors.purple} />
                  </View>
                  <View style={styles.songInfo}>
                    <Text style={styles.songTitle}>Peaceful Piano</Text>
                    <Text style={styles.songArtist}>Instrumental Calm · 12 min</Text>
                  </View>
                  <TouchableOpacity style={styles.songPlayIcon}>
                    <MaterialIcons name="play-circle-filled" size={36} color={colors.purple} />
                  </TouchableOpacity>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.songCard, shadows.sm]} activeOpacity={0.8}>
                  <View style={[styles.songIconContainer, { backgroundColor: `${colors.accent}15` }]}>
                    <MaterialIcons name="music-note" size={32} color={colors.accent} />
                  </View>
                  <View style={styles.songInfo}>
                    <Text style={styles.songTitle}>Tibetan Bowls</Text>
                    <Text style={styles.songArtist}>Healing Sounds · 25 min</Text>
                  </View>
                  <TouchableOpacity style={styles.songPlayIcon}>
                    <MaterialIcons name="play-circle-filled" size={36} color={colors.accent} />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.featuredSection}
              activeOpacity={0.9}
              onPress={() => startSession({
                id: 'featured',
                title: 'Mindful Walking',
                duration: 15,
                type: 'Guided',
                description: 'Connect with movement and awareness',
              }, 'meditation')}
            >
              <LinearGradient
                colors={gradients.greenGlow as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featuredGradient}
              >
                <View style={styles.featuredContent}>
                  <MaterialIcons name="auto-awesome" size={32} color={colors.textLight} />
                  <View style={styles.featuredText}>
                    <Text style={styles.featuredTitle}>Today's Featured</Text>
                    <Text style={styles.featuredSubtitle}>Mindful Walking Meditation</Text>
                  </View>
                  <View style={styles.featuredButton}>
                    <Text style={styles.featuredButtonText}>Start</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {activeTab === 'quick' && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Practices</Text>
              <Text style={styles.sectionSubtitle}>Instant calm, anytime, anywhere</Text>

              {quickPractices.map((practice) => (
                <TouchableOpacity
                  key={practice.id}
                  style={[styles.quickCard, shadows.sm]}
                  activeOpacity={0.9}
                  onPress={() => startSession(practice, 'quick')}
                >
                  <View style={styles.quickLeft}>
                    <View style={styles.quickIconContainer}>
                      <MaterialIcons name={practice.icon} size={24} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.quickTitle}>{practice.title}</Text>
                      <Text style={styles.quickDuration}>{practice.duration} minute{practice.duration > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.quickStartButton}
                    onPress={() => startSession(practice, 'quick')}
                  >
                    <MaterialIcons name="play-circle-filled" size={40} color={colors.primary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.streakSection}>
              <View style={[styles.streakCard, shadows.md]}>
                <View style={styles.streakHeader}>
                  <MaterialIcons name="local-fire-department" size={32} color={colors.accent} />
                  <Text style={styles.streakNumber}>{currentStreak}</Text>
                </View>
                <Text style={styles.streakTitle}>Day Streak</Text>
                <Text style={styles.streakText}>Keep going! You're building a great habit</Text>
              </View>
            </View>

            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsTitle}>Benefits of Quick Practice</Text>
              <View style={styles.benefitItem}>
                <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                <Text style={styles.benefitText}>Reduces stress in moments</Text>
              </View>
              <View style={styles.benefitItem}>
                <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                <Text style={styles.benefitText}>Improves focus and clarity</Text>
              </View>
              <View style={styles.benefitItem}>
                <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                <Text style={styles.benefitText}>Easy to fit into busy schedules</Text>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <Modal
        visible={sessionActive}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <LinearGradient
          colors={
            sessionType === 'breathing' && activeSession?.gradient
              ? (activeSession.gradient as [string, string, ...string[]])
              : [colors.primary, colors.primaryDark] as [string, string, ...string[]]
          }
          style={styles.sessionModal}
        >
          <SafeAreaView style={styles.sessionContainer}>
            <ScrollView 
              contentContainerStyle={styles.sessionScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.sessionHeader}>
                <TouchableOpacity onPress={stopSession} style={styles.closeButton}>
                  <MaterialIcons name="close" size={28} color={colors.textLight} />
                </TouchableOpacity>
                <Text style={styles.sessionHeaderTitle}>{activeSession?.title}</Text>
                <TouchableOpacity onPress={pauseSession} style={styles.pauseButton}>
                  <MaterialIcons 
                    name={isPaused ? 'play-arrow' : 'pause'} 
                    size={28} 
                    color={colors.textLight} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.sessionBody}>
                {sessionType === 'breathing' && (
                  <View style={styles.breathingContainer}>
                    <Animated.View 
                      style={[
                        styles.breathingCircle,
                        {
                          transform: [{ scale: breathScale }],
                          opacity: breathOpacity,
                        },
                      ]}
                    >
                      <View style={styles.breathingInner}>
                        <MaterialIcons name="air" size={48} color={colors.textLight} />
                      </View>
                    </Animated.View>
                    
                    <Text style={styles.breathingText}>
                      {breathingPhase === 'in' ? 'Breathe In' : 'Breathe Out'}
                    </Text>

                    {activeSession?.instructions && (
                      <View style={styles.instructionsContainer}>
                        {activeSession.instructions.map((instruction: string, index: number) => (
                          <View key={index} style={styles.instructionItem}>
                            <View style={styles.instructionDot} />
                            <Text style={styles.instructionText}>{instruction}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {(sessionType === 'meditation' || sessionType === 'quick') && (
                  <View style={styles.meditationContainer}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                      <Svg width={200} height={200}>
                        <Circle
                          cx={100}
                          cy={100}
                          r={90}
                          stroke={colors.textLight}
                          strokeWidth={3}
                          fill="transparent"
                          opacity={0.3}
                        />
                        <Circle
                          cx={100}
                          cy={100}
                          r={70}
                          stroke={colors.textLight}
                          strokeWidth={2}
                          fill="transparent"
                          opacity={0.5}
                        />
                        <Circle
                          cx={100}
                          cy={100}
                          r={50}
                          fill={colors.textLight}
                          opacity={0.2}
                        />
                      </Svg>
                    </Animated.View>
                    
                    <Text style={styles.meditationText}>
                      {activeSession?.description || 'Focus on your breath'}
                    </Text>
                  </View>
                )}

                <View style={styles.timerContainer}>
                  <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
                  <Text style={styles.timerLabel}>Remaining</Text>
                </View>

                <View style={styles.sessionControls}>
                  <TouchableOpacity 
                    style={styles.controlButton}
                    onPress={pauseSession}
                  >
                    <MaterialIcons 
                      name={isPaused ? 'play-arrow' : 'pause'} 
                      size={32} 
                      color={colors.textLight} 
                    />
                    <Text style={styles.controlButtonText}>
                      {isPaused ? 'Resume' : 'Pause'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.controlButton}
                    onPress={stopSession}
                  >
                    <MaterialIcons name="stop" size={32} color={colors.textLight} />
                    <Text style={styles.controlButtonText}>End</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </Modal>

      <Modal
        visible={showStats}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStats(false)}
      >
        <View style={styles.statsModalOverlay}>
          <SafeAreaView style={styles.statsModalSafeArea}>
            <View style={[styles.statsModal, shadows.lg]}>
              <View style={styles.statsHeader}>
                <Text style={styles.statsTitle}>Your Progress</Text>
                <TouchableOpacity onPress={() => setShowStats(false)}>
                  <MaterialIcons name="close" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.statsGrid}>
                <View style={[styles.statCard, shadows.sm]}>
                  <MaterialIcons name="check-circle" size={32} color={colors.primary} />
                  <Text style={styles.statNumber}>
                    {sessionsLoading ? '...' : completedSessions}
                  </Text>
                  <Text style={styles.statLabel}>Sessions</Text>
                </View>

                <View style={[styles.statCard, shadows.sm]}>
                  <MaterialIcons name="schedule" size={32} color={colors.secondary} />
                  <Text style={styles.statNumber}>
                    {sessionsLoading ? '...' : totalMinutes}
                  </Text>
                  <Text style={styles.statLabel}>Minutes</Text>
                </View>

                <View style={[styles.statCard, shadows.sm]}>
                  <MaterialIcons name="local-fire-department" size={32} color={colors.accent} />
                  <Text style={styles.statNumber}>
                    {sessionsLoading ? '...' : currentStreak}
                  </Text>
                  <Text style={styles.statLabel}>Day Streak</Text>
                </View>

                <View style={[styles.statCard, shadows.sm]}>
                  <MaterialIcons name="emoji-events" size={32} color={colors.purple} />
                  <Text style={styles.statNumber}>
                    {sessionsLoading ? '...' : Math.floor(completedSessions / 5)}
                  </Text>
                  <Text style={styles.statLabel}>Achievements</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.closeStatsButton, shadows.sm]}
                onPress={() => setShowStats(false)}
              >
                <Text style={styles.closeStatsButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={showMoodSelector}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowMoodSelector(false)}
      >
        <View style={styles.moodSelectorModal}>
          <View style={[styles.moodSelectorContent, shadows.lg]}>
            <Text style={styles.moodSelectorTitle}>How are you feeling?</Text>
            <Text style={styles.debugText}>
              Selected: {selectedMood ? selectedMood : 'None'}
            </Text>
            
            <View style={styles.moodOptionsContainer}>
              {(['great', 'good', 'okay', 'bad', 'terrible'] as const).map((mood) => {
                const isSelected = selectedMood === mood;
                return (
                  <TouchableOpacity
                    key={mood}
                    style={[
                      styles.moodOption, 
                      shadows.sm,
                      isSelected && styles.moodOptionSelected
                    ]}
                    onPress={() => {
                      console.log('Selecting mood:', mood, 'Current selected:', selectedMood);
                      setSelectedMood(mood);
                    }}
                  >
                    <Text style={styles.moodOptionEmoji}>{getMoodEmoji(mood)}</Text>
                    <Text style={[
                      styles.moodOptionText,
                      isSelected && styles.moodOptionTextSelected
                    ]}>
                      {mood.charAt(0).toUpperCase() + mood.slice(1)}
                    </Text>
                    {isSelected && (
                      <MaterialIcons 
                        name="check-circle" 
                        size={24} 
                        color={colors.primary} 
                        style={styles.moodOptionCheck}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedMood ? (
              <TouchableOpacity
                style={[styles.confirmMoodButton, shadows.sm]}
                onPress={() => handleMoodLog(selectedMood)}
              >
                <Text style={styles.confirmMoodButtonText}>
                  Confirm - I'm feeling {selectedMood}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.selectPrompt}>
                <Text style={styles.selectPromptText}>Select a mood above</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeMoodSelectorButton}
              onPress={() => {
                setSelectedMood(null);
                setShowMoodSelector(false);
              }}
            >
              <Text style={styles.closeMoodSelectorText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNavigation activeTab="mindfulness" onTabChange={onNavigate} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 100,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.xl,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  statsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  activeTabText: {
    color: colors.textLight,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    marginBottom: spacing.lg,
  },
  exerciseCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  exerciseGradient: {
    padding: spacing.lg,
  },
  exerciseContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    gap: spacing.md,
  },
  exerciseIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  exerciseInfo: {
    flex: 1,
    minWidth: 0,
  },
  exerciseTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    opacity: 0.9,
    fontFamily: 'Quicksand_500Medium',
    marginBottom: spacing.sm,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    opacity: 0.9,
    fontFamily: 'Quicksand_500Medium',
  },
  metaBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  metaBadgeText: {
    fontSize: 10,
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  tipsSection: {
    backgroundColor: colors.primaryPale,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  tipsTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.md,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontFamily: 'Quicksand_500Medium',
    lineHeight: 20,
  },
  sessionGrid: {
    gap: spacing.md,
  },
  sessionCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(100, 150, 255, 0.08)',
  },
  sessionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sessionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 4,
    minHeight: 42,
  },
  sessionType: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    marginBottom: spacing.sm,
    minHeight: 16,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    minHeight: 32,
  },
  sessionDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionDurationText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  sessionPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredSection: {
    marginBottom: spacing.xl,
  },
  featuredGradient: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featuredText: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    opacity: 0.9,
    fontFamily: 'Quicksand_600SemiBold',
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Poppins_700Bold',
  },
  featuredButton: {
    backgroundColor: colors.textLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  featuredButtonText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  quickCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  quickLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  quickIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 2,
  },
  quickDuration: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  quickStartButton: {
    flexShrink: 0,
  },
  streakSection: {
    marginBottom: spacing.xl,
  },
  streakCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  streakTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.xs,
  },
  streakText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    textAlign: 'center',
  },
  benefitsSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  benefitsTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  benefitText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    textAlign: 'center',
  },
  sessionModal: {
    flex: 1,
  },
  sessionContainer: {
    flex: 1,
  },
  sessionScrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionHeaderTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Poppins_700Bold',
  },
  pauseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    width: '100%',
  },
  breathingContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    width: '100%',
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  breathingInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.lg,
    textAlign: 'center',
    width: '100%',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    width: '90%',
    alignSelf: 'center',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    width: '100%',
  },
  instructionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textLight,
    marginRight: spacing.md,
    marginTop: 6,
    flexShrink: 0,
  },
  instructionText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    fontFamily: 'Quicksand_500Medium',
    flex: 1,
    flexWrap: 'wrap',
    includeFontPadding: false,
    textAlignVertical: 'top',
  },
  meditationContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  meditationText: {
    fontSize: fontSizes.lg,
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  timerText: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Poppins_700Bold',
  },
  timerLabel: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    fontFamily: 'Quicksand_500Medium',
    opacity: 0.8,
  },
  sessionControls: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    minWidth: 120,
  },
  controlButtonText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
    marginTop: spacing.xs,
  },
  statsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsModalSafeArea: {
    width: '100%',
    maxWidth: 450,
    paddingHorizontal: spacing.lg,
  },
  statsModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    width: '100%',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  statsTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    minHeight: 120,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginVertical: spacing.xs,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    textAlign: 'center',
  },
  closeStatsButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  closeStatsButtonText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
  moodCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  moodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  moodCardTitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  moodLoggedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodLoggedText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  moodLoggedEmoji: {
    fontSize: fontSizes.xl,
  },
  changeMoodText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  logMoodButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  logMoodButtonText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
  moodSelectorModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  moodSelectorContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '80%',
    maxWidth: 400,
  },
  moodSelectorTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  moodOptionsContainer: {
    gap: spacing.md,
  },
  moodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  moodOptionEmoji: {
    fontSize: 32,
  },
  moodOptionText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    flex: 1,
  },
  moodOptionSelected: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.primaryDark,
    transform: [{ scale: 1.05 }],
  },
  moodOptionTextSelected: {
    color: colors.textLight,
    fontFamily: 'Quicksand_700Bold',
  },
  moodOptionCheck: {
    marginLeft: spacing.sm,
  },
  confirmMoodButton: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  confirmMoodButtonText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
  selectPrompt: {
    marginTop: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  selectPromptText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    fontStyle: 'italic',
  },
  debugText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontFamily: 'Quicksand_600SemiBold',
    textAlign: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  closeMoodSelectorButton: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  closeMoodSelectorText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  songsGrid: {
    gap: spacing.sm,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(100, 150, 255, 0.12)',
    marginBottom: spacing.md,
  },
  songIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: fontSizes.md + 1,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  songArtist: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    opacity: 0.8,
  },
  songPlayIcon: {
    marginLeft: spacing.md,
  },
});

