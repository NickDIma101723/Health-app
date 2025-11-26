import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Pedometer } from 'expo-sensors';
import { 
  BottomNavigation,
  ProgressBar,
  BackgroundDecorations,
  HeartRateMonitor,
  SleepTracker,
  StepTracker,
} from '../components';
import { colors, spacing, fontSizes, borderRadius, shadows, gradients } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useHealthMetrics, useUserGoals, useNotifications, useNutritionAdapter, useScheduleAdapter } from '../hooks';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  onNavigate?: (screen: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { user, signOut } = useAuth();
  const { metrics, loading: metricsLoading, incrementWater, updateMetrics, updateHeartRate, updateSleep } = useHealthMetrics();
  const { goals, loading: goalsLoading } = useUserGoals();
  const { notifications: dbNotifications, unreadCount, markAsRead, markAllAsRead, loading: notificationsLoading } = useNotifications();
  const { getDailyNutrition, goals: nutritionGoals, addWaterIntake } = useNutritionAdapter();
  const { activities, weeklyGoals: scheduleGoals, getActivitiesForDate, addActivity } = useScheduleAdapter();
  
  const today = new Date().toISOString().split('T')[0];
  const todayNutrition = getDailyNutrition(today);
  
  const todayActivities = getActivitiesForDate(today);
  const completedWorkouts = todayActivities.filter(a => a.type === 'workout' && a.status === 'completed');
  const totalExerciseMinutes = completedWorkouts.reduce((sum, a) => sum + a.duration, 0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showHeartRateMonitor, setShowHeartRateMonitor] = useState(false);
  const [showSleepTracker, setShowSleepTracker] = useState(false);
  const [showStepTracker, setShowStepTracker] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('Just now');
  const [pedometerAvailable, setPedometerAvailable] = useState(false);
  const [profileName, setProfileName] = useState<string>('');
  const lastStepCount = useRef<number | null>(null);

  const loading = metricsLoading || goalsLoading;

  // Fetch user profile to get updated name
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      
      if (data && !error) {
        setProfileName(data.full_name || '');
      }
    };
    
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const updateRelativeTime = () => {
      if (metrics?.updated_at) {
        const now = new Date();
        const updated = new Date(metrics.updated_at);
        const diffMs = now.getTime() - updated.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) {
          setLastUpdateTime('Just now');
        } else if (diffMins < 60) {
          setLastUpdateTime(`${diffMins}m ago`);
        } else {
          const diffHours = Math.floor(diffMins / 60);
          setLastUpdateTime(`${diffHours}h ago`);
        }
      } else {
        setLastUpdateTime('Just now');
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 60000);

    return () => clearInterval(interval);
  }, [metrics?.updated_at]);

  useEffect(() => {
    let subscription: any;
    let sessionStartSteps = 0;
    let isFirstUpdate = true;
    let lastUpdateTime = Date.now();

    const setupPedometer = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      setPedometerAvailable(isAvailable);

      if (isAvailable && metrics) {
        subscription = Pedometer.watchStepCount((result) => {
          if (isFirstUpdate) {
            sessionStartSteps = result.steps;
            isFirstUpdate = false;
            return;
          }

          const sessionSteps = result.steps - sessionStartSteps;
          
          const now = Date.now();
          const timeSinceLastUpdate = now - lastUpdateTime;
          const shouldUpdate = sessionSteps >= 10 || timeSinceLastUpdate >= 30000;
          
          if (sessionSteps > 0 && shouldUpdate && updateMetrics) {
            const currentDbSteps = metrics?.steps || 0;
            const newTotalSteps = currentDbSteps + sessionSteps;
            
            updateMetrics({ steps: newTotalSteps });
            sessionStartSteps = result.steps;
            lastUpdateTime = now;
          }
        });
      }
    };

    setupPedometer();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [metrics?.id, updateMetrics]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!user || !activities.length) return;

    const checkUpcomingActivities = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const todayActivities = activities.filter(
        a => a.date === today && a.status !== 'completed'
      );
      
      todayActivities.forEach(activity => {
        const [activityHour, activityMin] = activity.time.split(':').map(Number);
        const activityTime = new Date(now);
        activityTime.setHours(activityHour, activityMin, 0, 0);
        
        const timeUntilActivity = activityTime.getTime() - now.getTime();
        const minutesUntil = Math.floor(timeUntilActivity / 60000);
        
        if (minutesUntil >= 14 && minutesUntil <= 15) {
          supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', 'activity_reminder')
            .eq('message', `${activity.title} starts in 15 minutes`)
            .single()
            .then(({ data }) => {
              if (!data) {
                supabase.from('notifications').insert({
                  user_id: user.id,
                  title: 'Upcoming Activity',
                  message: `${activity.title} starts in 15 minutes`,
                  type: 'activity_reminder',
                  is_read: false,
                }).then(({ error }) => {
                  if (error) console.error('Failed to create activity notification:', error);
                });
              }
            });
        }
      });
    };

    checkUpcomingActivities();
    const interval = setInterval(checkUpcomingActivities, 60000);

    return () => clearInterval(interval);
  }, [user, activities]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatNotificationTime = (timestamp: string) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMs = now.getTime() - notifTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const handleLogMeal = () => {
    addActivity({
      title: 'Meal',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      duration: 30,
      type: 'meal',
      color: colors.accent,
      icon: 'restaurant',
      status: 'incomplete',
      date: new Date().toISOString().split('T')[0],
    });
    onNavigate?.('schedule');
  };

  const handleStartMorningStretch = () => {
    addActivity({
      title: 'Morning Stretch Routine',
      description: 'Gentle stretching routine to improve flexibility',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      duration: 10,
      type: 'workout',
      color: colors.primary,
      icon: 'spa',
      status: 'incomplete',
      date: new Date().toISOString().split('T')[0],
      tags: ['Wellness', 'Morning'],
    });
    onNavigate?.('schedule');
  };

  const handleLogWater = async () => {
    if (addWaterIntake) {
      await addWaterIntake(250);
      Alert.alert('Water Logged', 'Added 250ml (1 glass) to your daily intake!');
    }
  };

  const handleSaveHeartRate = async (bpm: number) => {
    if (updateHeartRate) {
      const result = await updateHeartRate(bpm);
      if (!result?.error) {
        Alert.alert('Success', `Heart rate recorded: ${bpm} BPM`);
      }
    }
  };

  const handleSaveSleep = async (hours: number) => {
    if (updateSleep) {
      const result = await updateSleep(hours);
      if (!result?.error) {
        Alert.alert('Success', `Sleep recorded: ${hours.toFixed(1)} hours`);
      }
    }
  };

  const handleSaveSteps = async (steps: number) => {
    if (updateMetrics) {
      const result = await updateMetrics({ steps });
      if (!result?.error) {
        Alert.alert('Success', `Steps updated to ${steps.toLocaleString()}`);
      }
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await signOut();
  };

  const getRecommendations = () => {
    const waterRemaining = nutritionGoals.water - todayNutrition.water;
    const caloriesRemaining = (goals?.calories_daily || 2200) - todayNutrition.calories;
    const weeklyWorkoutProgress = (scheduleGoals.workouts.current / scheduleGoals.workouts.target) * 100;
    
    const allRecommendations = [
      waterRemaining > 500 && {
        id: 'hydration',
        icon: 'local-drink',
        iconColor: colors.teal,
        iconBg: colors.statWater,
        glowColor: colors.teal,
        title: 'Hydration Reminder',
        description: `You're ${(waterRemaining / 1000).toFixed(1)}L away from your daily goal. Stay hydrated for optimal performance!`,
        tags: [{ text: 'Hydration', color: colors.teal, bg: colors.statWater }],
        buttonText: 'Log Water',
        buttonColor: colors.teal,
        action: handleLogWater,
        badge: { icon: 'notifications-active', text: 'Now', color: colors.teal, bg: 'rgba(100, 200, 255, 0.1)' },
      },
      
      {
        id: 'morning-stretch',
        icon: 'spa',
        iconColor: colors.primary,
        iconBg: colors.primaryPale,
        glowColor: colors.primary,
        title: 'Morning Stretch Routine',
        description: 'Start your day with a gentle stretching routine to improve flexibility and reduce stress.',
        tags: [
          { text: 'Wellness', color: colors.textPrimary, bg: colors.background },
          { text: 'Morning', color: colors.textPrimary, bg: colors.background },
        ],
        buttonText: 'Add to Schedule',
        buttonColor: colors.primary,
        action: handleStartMorningStretch,
        badge: { icon: 'schedule', text: '10 min', color: colors.textSecondary, bg: 'transparent' },
      },
      
      caloriesRemaining > 500 && {
        id: 'meal-reminder',
        icon: 'restaurant',
        iconColor: colors.accent,
        iconBg: colors.accentLight,
        glowColor: colors.accent,
        title: 'Log Your Meal',
        description: `You have ${caloriesRemaining.toFixed(0)} calories left for today. Don't forget to log your meals!`,
        tags: [{ text: 'Nutrition', color: colors.accent, bg: colors.accentLight }],
        buttonText: 'Log Meal',
        buttonColor: colors.accent,
        action: handleLogMeal,
        badge: { icon: 'restaurant-menu', text: 'Important', color: colors.accent, bg: 'rgba(255, 111, 97, 0.1)' },
      },
      
      weeklyWorkoutProgress < 100 && {
        id: 'workout-progress',
        icon: 'fitness-center',
        iconColor: colors.success,
        iconBg: colors.statCalories,
        glowColor: colors.success,
        title: 'Weekly Workout Progress',
        description: `You've completed ${scheduleGoals.workouts.current}/${scheduleGoals.workouts.target} workouts this week. ${
          weeklyWorkoutProgress >= 66 ? "You're almost there!" : "Keep up the momentum!"
        }`,
        tags: [{ text: 'Exercise', color: colors.success, bg: colors.statCalories }],
        buttonText: 'View Schedule',
        buttonColor: colors.success,
        action: () => onNavigate?.('schedule'),
        badge: { icon: 'trending-up', text: `${Math.round(weeklyWorkoutProgress)}%`, color: colors.success, bg: 'rgba(76, 175, 80, 0.1)' },
      },
      
      new Date().getHours() >= 21 && {
        id: 'sleep-reminder',
        icon: 'bedtime',
        iconColor: colors.purple,
        iconBg: colors.statSleep,
        glowColor: colors.purple,
        title: 'Wind Down for Better Sleep',
        description: 'It\'s getting late. Consider starting your evening routine for better sleep quality.',
        tags: [{ text: 'Sleep', color: colors.purple, bg: colors.statSleep }],
        buttonText: 'Track Sleep',
        buttonColor: colors.purple,
        action: () => setShowSleepTracker(true),
        badge: { icon: 'nightlight', text: 'Evening', color: colors.purple, bg: 'rgba(156, 39, 176, 0.1)' },
      },
    ].filter(Boolean) as any[];
    
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const rotationIndex = dayOfYear % allRecommendations.length;
    
    const recommendations: any[] = [];
    
    const firstRec = allRecommendations[rotationIndex];
    recommendations.push(firstRec);
    
    const waterRec = allRecommendations.find((r: any) => r?.id === 'hydration');
    if (waterRec && waterRemaining > 1000 && firstRec?.id !== 'hydration') {
      recommendations.push(waterRec);
    } else {
      let nextIndex = (rotationIndex + 1) % allRecommendations.length;
      let nextRec = allRecommendations[nextIndex];
      
      let attempts = 0;
      while (nextRec?.id === firstRec?.id && attempts < allRecommendations.length) {
        nextIndex = (nextIndex + 1) % allRecommendations.length;
        nextRec = allRecommendations[nextIndex];
        attempts++;
      }
      
      if (nextRec?.id !== firstRec?.id) {
        recommendations.push(nextRec);
      }
    }
    
    return recommendations;
  };

  const recommendations = getRecommendations();

  const firstName = profileName 
    ? profileName.split(' ')[0] 
    : (user?.user_metadata?.name?.split(' ')[0] || 'there');
  const stepsProgress = metrics && goals 
    ? ((metrics.steps || 0) / (goals.steps_daily || 1)) * 100 
    : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your health data...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        scrollEventThrottle={16}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.coachButton}
              onPress={() => onNavigate?.('coach-selection')}
            >
              <MaterialIcons name="person-search" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => setShowNotifications(true)}
            >
              <MaterialIcons name="notifications-none" size={24} color={colors.primary} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge} />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => onNavigate?.('profile')}
            >
              <MaterialIcons name="person-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <MaterialIcons name="logout" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View style={[
          styles.heroCard, 
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setShowStepTracker(true)}
          >
            <LinearGradient
              colors={gradients.primaryBold as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroIconContainer}>
                  <MaterialIcons name="directions-walk" size={36} color={colors.textLight} />
                </View>
                <View style={styles.heroTimeInfo}>
                  <MaterialIcons name="schedule" size={14} color={colors.textLight} />
                  <Text style={styles.heroTime}>{lastUpdateTime}</Text>
                </View>
              </View>
              
              <View style={styles.heroMainContent}>
                <Text style={styles.heroLabel}>Daily Steps</Text>
                <View style={styles.heroStatsRow}>
                  <Text style={styles.heroValue}>{(metrics?.steps || 0).toLocaleString()}</Text>
                  <Text style={styles.heroGoal}>/{(goals?.steps_daily || 10000).toLocaleString()}</Text>
                </View>
                
                <View style={styles.heroProgressSection}>
                  <View style={styles.heroProgressBar}>
                    <View style={[styles.heroProgressFill, { width: `${stepsProgress}%` }]} />
                  </View>
                  <View style={styles.heroProgressLabels}>
                    <Text style={styles.heroProgressText}>{stepsProgress.toFixed(0)}% Complete</Text>
                    <Text style={styles.heroProgressText}>{((goals?.steps_daily || 10000) - (metrics?.steps || 0)).toLocaleString()} left</Text>
                  </View>
                </View>
              </View>

              <View style={styles.heroCornerDecoration} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Activity</Text>
            <TouchableOpacity onPress={() => onNavigate?.('mindfulness-insights')}>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.asymmetricGrid}>
            <TouchableOpacity 
              style={[styles.largeCard, shadows.md]}
              onPress={() => onNavigate?.('nutrition')}
            >
              <LinearGradient
                colors={['#FFB085', '#FFCDC7'] as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.largeCardGradient}
              >
                <View style={styles.largeCardIcon}>
                  <MaterialIcons name="local-fire-department" size={28} color={colors.textLight} />
                </View>
                <Text style={styles.largeCardValue}>{metrics?.calories_burned || 0}</Text>
                <Text style={styles.largeCardLabel}>Calories Burned</Text>
                <View style={styles.largeCardProgress}>
                  <View style={styles.whiteProgressBar}>
                    <View style={[styles.whiteProgressFill, { 
                      width: `${((metrics?.calories_burned || 0) / (goals?.calories_daily || 2200)) * 100}%` 
                    }]} />
                  </View>
                </View>
                <Text style={styles.largeCardSubtext}>Goal: {goals?.calories_daily || 2200} cal</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.smallCardsColumn}>
              <TouchableOpacity 
                style={[styles.smallCard, shadows.sm, { backgroundColor: colors.surface }]}
                onPress={() => onNavigate?.('nutrition')}
              >
                <View style={[styles.smallCardIcon, { backgroundColor: colors.statWater }]}>
                  <MaterialIcons name="water-drop" size={20} color={colors.teal} />
                </View>
                <View style={styles.smallCardContent}>
                  <Text style={styles.smallCardValue}>{(todayNutrition.water / 1000).toFixed(1)}L</Text>
                  <Text style={styles.smallCardLabel}>Water</Text>
                  <ProgressBar
                    progress={todayNutrition.water}
                    max={nutritionGoals.water}
                    height={3}
                    gradientColors={gradients.ocean}
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.smallCard, shadows.sm, { backgroundColor: colors.surface }]}
                onPress={() => setShowHeartRateMonitor(true)}
              >
                <View style={[styles.smallCardIcon, { backgroundColor: colors.statHeart }]}>
                  <MaterialIcons name="favorite" size={20} color={colors.coral} />
                </View>
                <View style={styles.smallCardContent}>
                  <Text style={styles.smallCardValue}>{metrics?.heart_rate || '--'}</Text>
                  <Text style={styles.smallCardLabel}>Heart Rate</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.horizontalCardsRow}>
            <TouchableOpacity 
              style={[styles.horizontalCard, shadows.sm]}
              onPress={() => setShowSleepTracker(true)}
            >
              <LinearGradient
                colors={gradients.purple as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.horizontalCardGradient}
              >
                <View style={styles.horizontalCardLeft}>
                  <View style={styles.horizontalCardIconContainer}>
                    <MaterialIcons name="bedtime" size={24} color={colors.textLight} />
                  </View>
                  <View>
                    <Text style={styles.horizontalCardValue}>{(metrics?.sleep_hours || 0).toFixed(1)}h</Text>
                    <Text style={styles.horizontalCardLabel}>Sleep</Text>
                  </View>
                </View>
                <View style={styles.horizontalCardRight}>
                  <Text style={styles.horizontalCardSubtext}>Goal: {goals?.sleep_hours_daily || 8}h</Text>
                  <View style={styles.sleepQualityIndicator}>
                    <MaterialIcons name="check-circle" size={16} color={colors.textLight} />
                    <Text style={styles.sleepQualityText}>Good</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.horizontalCard, shadows.sm]}
              onPress={() => onNavigate?.('schedule')}
            >
              <LinearGradient
                colors={gradients.greenGlow as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.horizontalCardGradient}
              >
                <View style={styles.horizontalCardLeft}>
                  <View style={styles.horizontalCardIconContainer}>
                    <MaterialIcons name="fitness-center" size={24} color={colors.textLight} />
                  </View>
                  <View>
                    <Text style={styles.horizontalCardValue}>{totalExerciseMinutes}min</Text>
                    <Text style={styles.horizontalCardLabel}>Exercise</Text>
                  </View>
                </View>
                <View style={styles.horizontalCardRight}>
                  <Text style={styles.horizontalCardSubtext}>{completedWorkouts.length} workout{completedWorkouts.length !== 1 ? 's' : ''} today</Text>
                  <View style={styles.exerciseProgressCircle}>
                    <Text style={styles.exerciseProgressText}>{scheduleGoals.workouts.current}/{scheduleGoals.workouts.target}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionPill, shadows.sm]}
              onPress={handleLogMeal}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryLight] as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionPillGradient}
              >
                <View style={styles.actionPillIcon}>
                  <MaterialIcons name="restaurant" size={20} color={colors.textLight} />
                </View>
                <Text style={styles.actionPillText}>Log Meal</Text>
                <MaterialIcons name="arrow-forward" size={18} color={colors.textLight} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionPill, shadows.sm]}
              onPress={() => onNavigate?.('mindfulness')}
            >
              <LinearGradient
                colors={[colors.mint, colors.primaryLight] as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionPillGradient}
              >
                <View style={styles.actionPillIcon}>
                  <MaterialIcons name="self-improvement" size={20} color={colors.textLight} />
                </View>
                <Text style={styles.actionPillText}>Meditate</Text>
                <MaterialIcons name="arrow-forward" size={18} color={colors.textLight} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionPill, shadows.sm]}
              onPress={() => onNavigate?.('mindfulness-insights')}
            >
              <LinearGradient
                colors={[colors.accent, '#FFCDC7'] as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionPillGradient}
              >
                <View style={styles.actionPillIcon}>
                  <MaterialIcons name="insights" size={20} color={colors.textLight} />
                </View>
                <Text style={styles.actionPillText}>View Insights</Text>
                <MaterialIcons name="arrow-forward" size={18} color={colors.textLight} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionPill, shadows.sm]}
              onPress={() => onNavigate?.('nutrition-calculator')}
            >
              <LinearGradient
                colors={[colors.purple, colors.lavender] as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionPillGradient}
              >
                <View style={styles.actionPillIcon}>
                  <MaterialIcons name="calculate" size={20} color={colors.textLight} />
                </View>
                <Text style={styles.actionPillText}>Nutrition Calculator</Text>
                <MaterialIcons name="arrow-forward" size={18} color={colors.textLight} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
          </View>
          
          {recommendations.map((rec, index) => (
            <TouchableOpacity 
              key={rec.id}
              style={[styles.aiCard, shadows.md, index > 0 && { marginTop: spacing.md }]}
              onPress={rec.action}
            >
              <View style={[styles.aiCardGlow, { backgroundColor: rec.glowColor }]} />
              <View style={styles.aiCardContent}>
                <View style={styles.aiCardLeft}>
                  <View style={[styles.aiCardIconContainer, { backgroundColor: rec.iconBg }]}>
                    <MaterialIcons name={rec.icon as any} size={32} color={rec.iconColor} />
                  </View>
                </View>
                <View style={styles.aiCardRight}>
                  <View style={styles.aiCardHeader}>
                    <Text style={styles.aiCardTitle}>{rec.title}</Text>
                    <View style={[styles.aiCardTime, { backgroundColor: rec.badge.bg }]}>
                      <MaterialIcons name={rec.badge.icon as any} size={14} color={rec.badge.color} />
                      <Text style={[styles.aiCardTimeText, { color: rec.badge.color }]}>{rec.badge.text}</Text>
                    </View>
                  </View>
                  <Text style={styles.aiCardDescription}>{rec.description}</Text>
                  <View style={styles.aiCardTags}>
                    {rec.tags.map((tag: any, i: number) => (
                      <View key={i} style={[styles.aiTag, { backgroundColor: tag.bg }]}>
                        <Text style={[styles.aiTagText, { color: tag.color }]}>{tag.text}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity 
                    style={[styles.aiCardButton, { borderColor: rec.buttonColor }]}
                    onPress={rec.action}
                  >
                    <Text style={[styles.aiCardButtonText, { color: rec.buttonColor }]}>{rec.buttonText}</Text>
                    <MaterialIcons 
                      name={rec.buttonText.includes('Add') ? 'add-circle-outline' : rec.buttonText.includes('Log') ? 'add' : 'arrow-forward'} 
                      size={16} 
                      color={rec.buttonColor} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </Animated.View>

      </ScrollView>

      <BottomNavigation 
        activeTab="home" 
        onTabChange={(tab) => {
          console.log('[HomeScreen] Navigation requested to:', tab);
          if (onNavigate) {
            onNavigate(tab);
          } else {
            console.log('[HomeScreen] WARNING: onNavigate prop is undefined!');
          }
        }} 
      />

      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notificationsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity 
                onPress={() => setShowNotifications(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.notificationsList}
              showsVerticalScrollIndicator={false}
            >
              {dbNotifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.is_read && styles.notificationItemUnread
                  ]}
                  onPress={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.id);
                    }
                  }}
                >
                  <View style={[
                    styles.notificationIcon,
                    { backgroundColor: 
                      notification.notification_type === 'achievement' ? colors.success :
                      notification.notification_type === 'reminder' ? colors.teal :
                      notification.notification_type === 'suggestion' ? colors.orange :
                      colors.primary
                    }
                  ]}>
                    <MaterialIcons 
                      name={
                        notification.notification_type === 'achievement' ? 'emoji-events' :
                        notification.notification_type === 'reminder' ? 'schedule' :
                        notification.notification_type === 'suggestion' ? 'lightbulb' :
                        'info'
                      }
                      size={20}
                      color={colors.textLight}
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      {!notification.is_read && (
                        <View style={styles.notificationUnreadDot} />
                      )}
                    </View>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationTime}>{formatNotificationTime(notification.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {dbNotifications.length === 0 && (
                <View style={styles.emptyNotifications}>
                  <MaterialIcons name="notifications-none" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyNotificationsText}>No notifications yet</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={markAllAsRead}
            >
              <Text style={styles.clearAllText}>Mark all as read</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <HeartRateMonitor
        visible={showHeartRateMonitor}
        onClose={() => setShowHeartRateMonitor(false)}
        onSave={handleSaveHeartRate}
      />

      <SleepTracker
        visible={showSleepTracker}
        onClose={() => setShowSleepTracker(false)}
        onSave={handleSaveSleep}
        currentHours={metrics?.sleep_hours || 0}
      />

      <StepTracker
        visible={showStepTracker}
        onClose={() => setShowStepTracker(false)}
        onSave={handleSaveSteps}
        currentSteps={metrics?.steps || 0}
      />

      {}
      <Modal
        visible={showLogoutConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModal}>
            <View style={styles.logoutIconContainer}>
              <MaterialIcons name="logout" size={48} color={colors.error} />
            </View>
            
            <Text style={styles.logoutTitle}>Sign Out</Text>
            <Text style={styles.logoutMessage}>
              Are you sure you want to sign out?
            </Text>

            <View style={styles.logoutButtons}>
              <TouchableOpacity 
                style={styles.logoutCancelButton}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.logoutConfirmButton}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: spacing.xl,
    paddingBottom: 100,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  greeting: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  coachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.coral,
  },
  heroCard: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  heroGradient: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    position: 'relative',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  heroTime: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    fontFamily: 'Quicksand_500Medium',
  },
  heroMainContent: {
    gap: spacing.sm,
  },
  heroLabel: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Poppins_700Bold',
  },
  heroGoal: {
    fontSize: fontSizes.xl,
    color: colors.textLight,
    opacity: 0.7,
    fontFamily: 'Quicksand_500Medium',
    marginLeft: 4,
  },
  heroProgressSection: {
    marginTop: spacing.sm,
  },
  heroProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: colors.textLight,
    borderRadius: 4,
  },
  heroProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  heroProgressText: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    opacity: 0.8,
    fontFamily: 'Quicksand_500Medium',
  },
  heroCornerDecoration: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  seeAllButton: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  asymmetricGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    minHeight: 220,
  },
  largeCard: {
    flex: 2,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    minWidth: 180,
  },
  largeCardGradient: {
    padding: spacing.lg,
    flex: 1,
    justifyContent: 'space-between',
  },
  largeCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  largeCardValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 4,
  },
  largeCardLabel: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
    opacity: 0.95,
    marginBottom: spacing.sm,
  },
  largeCardProgress: {
    marginTop: spacing.xs,
  },
  whiteProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  whiteProgressFill: {
    height: '100%',
    backgroundColor: colors.textLight,
    borderRadius: 3,
  },
  largeCardSubtext: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    opacity: 0.8,
    fontFamily: 'Quicksand_500Medium',
  },
  smallCardsColumn: {
    flex: 1,
    gap: spacing.md,
    minWidth: 140,
  },
  smallCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  smallCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  smallCardContent: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  smallCardValue: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  smallCardLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  smallCardSubtext: {
    fontSize: 9,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    marginTop: 2,
  },
  horizontalCardsRow: {
    gap: spacing.md,
  },
  horizontalCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  horizontalCardGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    minHeight: 90,
  },
  horizontalCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  horizontalCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  horizontalCardValue: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Poppins_700Bold',
  },
  horizontalCardLabel: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    fontFamily: 'Quicksand_500Medium',
    opacity: 0.9,
  },
  horizontalCardRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    flexShrink: 0,
  },
  horizontalCardSubtext: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    opacity: 0.8,
    fontFamily: 'Quicksand_500Medium',
  },
  sleepQualityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  sleepQualityText: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
  exerciseProgressCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseProgressText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Poppins_700Bold',
  },
  actionsContainer: {
    gap: spacing.sm,
  },
  actionPill: {
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  actionPillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  actionPillIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionPillText: {
    flex: 1,
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
  aiCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  aiCardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.primary,
  },
  aiCardContent: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  aiCardLeft: {
    justifyContent: 'flex-start',
  },
  aiCardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCardRight: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiCardTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    flex: 1,
    marginRight: spacing.xs,
  },
  aiCardTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryPale,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    flexShrink: 0,
  },
  aiCardTimeText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  aiCardDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  aiCardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  aiTag: {
    backgroundColor: colors.primaryPale,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  aiTagText: {
    fontSize: 10,
    color: colors.primary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  aiCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  aiCardButtonText: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  notificationsModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    height: '75%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    backgroundColor: colors.background,
  },
  notificationItemUnread: {
    backgroundColor: 'rgba(100, 150, 255, 0.05)',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  notificationTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'Quicksand_600SemiBold',
    flex: 1,
  },
  notificationUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.xs,
  },
  notificationMessage: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  notificationTime: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    fontFamily: 'Quicksand_500Medium',
  },
  clearAllButton: {
    margin: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  clearAllText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  emptyNotifications: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyNotificationsText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  logoutModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  logoutIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoutTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.sm,
  },
  logoutMessage: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  logoutButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  logoutCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  logoutCancelText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  logoutConfirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  logoutConfirmText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
});
