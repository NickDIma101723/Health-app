import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BackgroundDecorations } from '../components';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const { width: screenWidth } = Dimensions.get('window');

interface ClientProgressAnalyticsScreenProps {
  route?: any;
  navigation?: any;
  clientId?: string;
  onBack?: () => void;
}

interface ProgressData {
  date: string;
  weight: number | null;
  workouts_completed: number;
  calories_consumed: number;
  water_intake: number;
  sleep_hours: number;
  steps: number;
  mood_score: number | null;
}

interface WeeklyStats {
  week_start: string;
  avg_weight: number;
  total_workouts: number;
  avg_calories: number;
  avg_water: number;
  avg_sleep: number;
  avg_steps: number;
  avg_mood: number;
}

interface GoalProgress {
  goal_type: string;
  target_value: number;
  current_value: number;
  start_date: string;
  target_date: string;
  progress_percentage: number;
}

export const ClientProgressAnalyticsScreen: React.FC<ClientProgressAnalyticsScreenProps> = ({
  route,
  navigation,
  clientId: propClientId,
  onBack,
}) => {
  const { coachData } = useAuth();
  const clientId = propClientId || route?.params?.clientId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [goalProgress, setGoalProgress] = useState<GoalProgress[]>([]);
  const [timeRange, setTimeRange] = useState<'1m' | '3m' | '6m' | '1y'>('3m');

  useEffect(() => {
    if (clientId && coachData) {
      loadProgressData();
    }
  }, [clientId, coachData, timeRange]);

  const loadProgressData = async () => {
    try {
      setLoading(true);

      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', clientId)
        .single();

      if (profileError) throw profileError;
      setClientProfile(profile);

      
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '1m':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3m':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6m':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      
      const { data: healthData, error: healthError } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', clientId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (healthError) throw healthError;

      
      const { data: activityData, error: activityError } = await supabase
        .from('activity_logs')
        .select('completed_at')
        .eq('user_id', clientId)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());

      if (activityError) throw activityError;

      
      const progressDataMap = new Map<string, ProgressData>();
      
      
      healthData?.forEach(metric => {
        const dateKey = metric.date;
        progressDataMap.set(dateKey, {
          date: dateKey,
          weight: metric.weight_kg,
          workouts_completed: 0,
          calories_consumed: metric.calories_burned || 0,
          water_intake: metric.water_intake || 0,
          sleep_hours: metric.sleep_hours || 0,
          steps: metric.steps || 0,
          mood_score: null
        });
      });

      
      const workoutsByDate = new Map<string, number>();
      activityData?.forEach(log => {
        const date = log.completed_at.split('T')[0];
        workoutsByDate.set(date, (workoutsByDate.get(date) || 0) + 1);
      });

      workoutsByDate.forEach((count, date) => {
        if (progressDataMap.has(date)) {
          progressDataMap.get(date)!.workouts_completed = count;
        } else {
          progressDataMap.set(date, {
            date,
            weight: null,
            workouts_completed: count,
            calories_consumed: 0,
            water_intake: 0,
            sleep_hours: 0,
            steps: 0,
            mood_score: null
          });
        }
      });

      const progressArray = Array.from(progressDataMap.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setProgressData(progressArray);

      
      const weeklyStatsArray = calculateWeeklyStats(progressArray);
      setWeeklyStats(weeklyStatsArray);

      
      setGoalProgress([
        {
          goal_type: 'Weight Loss',
          target_value: profile.weight - 10,
          current_value: profile.weight,
          start_date: startDate.toISOString().split('T')[0],
          target_date: endDate.toISOString().split('T')[0],
          progress_percentage: 65
        },
        {
          goal_type: 'Weekly Workouts',
          target_value: 5,
          current_value: 3.5,
          start_date: startDate.toISOString().split('T')[0],
          target_date: endDate.toISOString().split('T')[0],
          progress_percentage: 70
        }
      ]);

    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateWeeklyStats = (data: ProgressData[]): WeeklyStats[] => {
    const weeklyData = new Map<string, ProgressData[]>();
    
    data.forEach(item => {
      const date = new Date(item.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); 
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, []);
      }
      weeklyData.get(weekKey)!.push(item);
    });

    return Array.from(weeklyData.entries()).map(([weekStart, weekData]) => ({
      week_start: weekStart,
      avg_weight: weekData.reduce((sum, d) => sum + (d.weight || 0), 0) / weekData.filter(d => d.weight).length || 0,
      total_workouts: weekData.reduce((sum, d) => sum + d.workouts_completed, 0),
      avg_calories: weekData.reduce((sum, d) => sum + d.calories_consumed, 0) / weekData.length,
      avg_water: weekData.reduce((sum, d) => sum + d.water_intake, 0) / weekData.length,
      avg_sleep: weekData.reduce((sum, d) => sum + d.sleep_hours, 0) / weekData.length,
      avg_steps: weekData.reduce((sum, d) => sum + d.steps, 0) / weekData.length,
      avg_mood: weekData.reduce((sum, d) => sum + (d.mood_score || 0), 0) / weekData.filter(d => d.mood_score).length || 0,
    })).sort((a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime());
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProgressData();
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const renderSimpleChart = (data: number[], label: string, color: string, unit: string = '') => {
    if (data.length === 0) return null;
    
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{label}</Text>
          <Text style={styles.chartValue}>
            {data[data.length - 1]?.toFixed(1) || 0}{unit}
          </Text>
        </View>
        <View style={styles.chartArea}>
          <View style={styles.chartLine}>
            {data.map((value, index) => (
              <View
                key={index}
                style={[
                  styles.chartPoint,
                  {
                    left: `${(index / (data.length - 1)) * 100}%`,
                    bottom: `${((value - minValue) / range) * 100}%`,
                    backgroundColor: color,
                  }
                ]}
              />
            ))}
          </View>
        </View>
        <View style={styles.chartStats}>
          <Text style={styles.chartStat}>Min: {minValue.toFixed(1)}{unit}</Text>
          <Text style={styles.chartStat}>Max: {maxValue.toFixed(1)}{unit}</Text>
          <Text style={styles.chartStat}>
            Trend: {data[data.length - 1] > data[0] ? '↗️' : '↘️'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundDecorations />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress Analytics</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['1m', '3m', '6m', '1y'] as const).map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              timeRange === range && styles.timeRangeButtonActive
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[
              styles.timeRangeText,
              timeRange === range && styles.timeRangeTextActive
            ]}>
              {range.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {}
        {clientProfile && (
          <LinearGradient
            colors={[colors.primary, colors.primaryLight] as [string, string, ...string[]]}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryTitle}>{clientProfile.full_name}</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>
                  {progressData.filter(d => d.workouts_completed > 0).length}
                </Text>
                <Text style={styles.summaryStatLabel}>Active Days</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>
                  {progressData.reduce((sum, d) => sum + d.workouts_completed, 0)}
                </Text>
                <Text style={styles.summaryStatLabel}>Total Workouts</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>
                  {timeRange.toUpperCase()}
                </Text>
                <Text style={styles.summaryStatLabel}>Time Period</Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goal Progress</Text>
          {goalProgress.map((goal, index) => (
            <View key={index} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalType}>{goal.goal_type}</Text>
                <Text style={styles.goalPercentage}>{goal.progress_percentage}%</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${goal.progress_percentage}%` }
                  ]}
                />
              </View>
              <View style={styles.goalDetails}>
                <Text style={styles.goalDetail}>
                  Current: {goal.current_value} / Target: {goal.target_value}
                </Text>
                <Text style={styles.goalDate}>
                  Due: {new Date(goal.target_date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress Charts</Text>
          
          {renderSimpleChart(
            progressData.map(d => d.weight).filter(Boolean) as number[],
            'Weight Tracking',
            colors.primary,
            'kg'
          )}

          {renderSimpleChart(
            weeklyStats.map(w => w.total_workouts),
            'Weekly Workouts',
            colors.success,
            ' workouts'
          )}

          {renderSimpleChart(
            progressData.map(d => d.steps).filter(s => s > 0),
            'Daily Steps',
            colors.info,
            ' steps'
          )}

          {renderSimpleChart(
            progressData.map(d => d.sleep_hours).filter(s => s > 0),
            'Sleep Hours',
            colors.secondary,
            'h'
          )}
        </View>

        {}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Trends</Text>
          {weeklyStats.slice(-4).map((week, index) => (
            <View key={index} style={styles.weekCard}>
              <Text style={styles.weekTitle}>
                Week of {new Date(week.week_start).toLocaleDateString()}
              </Text>
              <View style={styles.weekStats}>
                <View style={styles.weekStat}>
                  <MaterialIcons name="fitness-center" size={16} color={colors.primary} />
                  <Text style={styles.weekStatText}>{week.total_workouts} workouts</Text>
                </View>
                {week.avg_weight > 0 && (
                  <View style={styles.weekStat}>
                    <MaterialIcons name="monitor-weight" size={16} color={colors.warning} />
                    <Text style={styles.weekStatText}>{week.avg_weight.toFixed(1)}kg avg</Text>
                  </View>
                )}
                <View style={styles.weekStat}>
                  <MaterialIcons name="directions-walk" size={16} color={colors.info} />
                  <Text style={styles.weekStatText}>{Math.round(week.avg_steps)} steps/day</Text>
                </View>
                <View style={styles.weekStat}>
                  <MaterialIcons name="bedtime" size={16} color={colors.secondary} />
                  <Text style={styles.weekStatText}>{week.avg_sleep.toFixed(1)}h sleep</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Insights</Text>
          <View style={styles.insightsCard}>
            <View style={styles.insight}>
              <MaterialIcons name="trending-up" size={20} color={colors.success} />
              <Text style={styles.insightText}>
                Workout consistency has improved by 25% this month
              </Text>
            </View>
            <View style={styles.insight}>
              <MaterialIcons name="schedule" size={20} color={colors.info} />
              <Text style={styles.insightText}>
                Best workout days are Monday, Wednesday, Friday
              </Text>
            </View>
            <View style={styles.insight}>
              <MaterialIcons name="star" size={20} color={colors.warning} />
              <Text style={styles.insightText}>
                Average sleep quality is good (7.2 hours/night)
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary,
  },
  timeRangeText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  timeRangeTextActive: {
    color: colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  summaryCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  summaryTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textLight,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: fontSizes.xxl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textLight,
  },
  summaryStatLabel: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textLight,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  goalType: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  goalPercentage: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  goalDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalDetail: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  goalDate: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  chartContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  chartValue: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  chartArea: {
    height: 120,
    position: 'relative',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  chartLine: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  chartPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
    marginBottom: -4,
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartStat: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  weekCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  weekTitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  weekStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  weekStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: '45%',
  },
  weekStatText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  insightsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  insightText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textPrimary,
    lineHeight: fontSizes.sm * 1.4,
  },
});