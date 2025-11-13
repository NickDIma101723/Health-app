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
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BackgroundDecorations } from '../components';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface CoachClientDetailScreenProps {
  route?: any;
  navigation?: any;
  clientId: string;
  onBack?: () => void;
  onNavigateToNotes?: (clientId: string) => void;
  onNavigate?: (screen: string, params?: any) => void;
}

interface ClientProfile {
  user_id: string;
  full_name: string;
  age: number | null;
  height: number | null;
  weight: number | null;
  gender: string;
  phone: string;
  bio: string;
  fitness_level: string;
  fitness_goals: string;
  health_notes: string;
  goals: string;
  created_at: string;
}

interface WeeklyGoal {
  workouts_current: number;
  workouts_goal: number;
  water_current: number;
  water_goal: number;
  calories_current: number;
  calories_goal: number;
}

interface Assignment {
  assigned_at: string;
  notes: string;
}

interface ActivityLog {
  id: string;
  title: string;
  activity_type: string;
  status: string;
  date: string;
  duration: number;
  completed_at: string;
}

interface HealthMetric {
  date: string;
  steps: number;
  calories_burned: number;
  water_intake: number;
  sleep_hours: number;
  exercise_minutes: number;
  weight_kg: number;
}

interface Meal {
  id: string;
  name: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  date: string;
  time: string;
}

export const CoachClientDetailScreen: React.FC<CoachClientDetailScreenProps> = ({
  route,
  navigation,
  clientId: propClientId,
  onBack,
  onNavigateToNotes,
  onNavigate,
}) => {
  const { coachData } = useAuth();
  const clientId = propClientId || route?.params?.clientId;
  
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (clientId && coachData) {
      loadClientData();
    }
  }, [clientId, coachData]);

    const loadClientData = async () => {
    if (!clientId || !coachData) return;

    try {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', clientId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: goalsData, error: goalsError } = await supabase
        .from('weekly_goals')
        .select('*')
        .eq('user_id', clientId)
        .maybeSingle();

      if (goalsError && goalsError.code !== 'PGRST116') throw goalsError;
      setWeeklyGoal(goalsData);

      console.log('Loading assignment for:', { coachId: coachData.id, clientId });
      
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('coach_client_assignments')
        .select('assigned_at, notes')
        .eq('coach_id', coachData.id)
        .eq('client_user_id', clientId)
        .eq('is_active', true)
        .single();

      console.log('Assignment query result:', { assignmentData, assignmentError });

      if (assignmentError && assignmentError.code !== 'PGRST116') throw assignmentError;
      setAssignment(assignmentData);

      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('id, title, activity_type, status, date, duration')
        .eq('user_id', clientId)
        .order('date', { ascending: false })
        .limit(10);

      if (activitiesError) throw activitiesError;

      const activitiesWithLogs = await Promise.all(
        (activitiesData || []).map(async (activity) => {
          const { data: logData } = await supabase
            .from('activity_logs')
            .select('completed_at')
            .eq('activity_id', activity.id)
            .maybeSingle();

          return {
            ...activity,
            completed_at: logData?.completed_at || null,
          };
        })
      );

      setActivityLogs(activitiesWithLogs);

      const { data: metricsData, error: metricsError } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', clientId)
        .order('date', { ascending: false })
        .limit(7);

      if (metricsError) throw metricsError;
      setHealthMetrics(metricsData || []);

      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', clientId)
        .order('date', { ascending: false })
        .limit(10);

      if (mealsError) throw mealsError;
      setMeals(mealsData || []);

    } catch (error) {
      console.error('Error loading client data:', error);
      Alert.alert('Error', 'Failed to load client data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClientData();
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const handleViewNotes = () => {
    if (onNavigateToNotes) {
      onNavigateToNotes(clientId);
    }
  };

  const handleReassignClient = async () => {
    console.log('🔄 Unassign Client button pressed!');
    console.log('Current data:', { clientId, coachData: coachData?.id, profile: profile?.full_name });
    
    // Use platform-specific confirmation
    const confirmed = Platform.OS === 'web' 
      ? window.confirm('This will unassign the client from their current coach and make them available for reassignment. Continue?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Reassign Client',
            'This will unassign the client from their current coach and make them available for reassignment. Continue?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Reassign', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (confirmed) {
      console.log('✅ User confirmed unassignment');
            try {
              if (!coachData) {
                Alert.alert('Error', 'Coach data not found');
                return;
              }

              console.log('Unassigning client:', { clientId, coachId: coachData.id });
              
              // First check if assignment exists
              const { data: existing, error: checkError } = await supabase
                .from('coach_client_assignments')
                .select('*')
                .eq('client_user_id', clientId)
                .eq('coach_id', coachData.id)
                .eq('is_active', true);

              console.log('Existing assignments:', { existing, checkError });

              if (checkError) {
                console.error('Error checking assignment:', checkError);
                throw new Error(`Failed to check assignment: ${checkError.message}`);
              }

              if (!existing || existing.length === 0) {
                Alert.alert('Error', 'No active assignment found for this client');
                return;
              }
              
              const { data, error } = await supabase
                .from('coach_client_assignments')
                .update({ is_active: false })
                .eq('client_user_id', clientId)
                .eq('coach_id', coachData.id)
                .eq('is_active', true)
                .select();

              console.log('Unassign result:', { data, error });

              if (error) {
                console.error('Update error:', error);
                throw new Error(`Failed to unassign client: ${error.message}`);
              }
              
              if (!data || data.length === 0) {
                Alert.alert('Error', 'No assignment was updated. The client may already be unassigned.');
                return;
              }

              console.log('Successfully unassigned client:', data);
              
              // Platform-specific success message
              if (Platform.OS === 'web') {
                alert('Client has been unassigned and is now available for reassignment.');
              } else {
                Alert.alert('Success', 'Client has been unassigned and is now available for reassignment.');
              }
              
              if (onBack) {
                onBack();
              }
            } catch (error: any) {
              console.error('Error reassigning client:', error);
              const errorMessage = error.message || 'Failed to reassign client. Please check the console for details.';
              
              if (Platform.OS === 'web') {
                alert(`Error: ${errorMessage}`);
              } else {
                Alert.alert('Error', errorMessage);
              }
            }
    }
  };

  const calculateBMI = (): string | null => {
    if (!profile?.weight || !profile?.height) return null;
    const heightInMeters = profile.height / 100;
    const bmi = profile.weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi: number): { text: string; color: string } => {
    if (bmi < 18.5) return { text: 'Underweight', color: colors.warning };
    if (bmi < 25) return { text: 'Normal', color: colors.success };
    if (bmi < 30) return { text: 'Overweight', color: colors.warning };
    return { text: 'Obese', color: colors.error };
  };

  const getProgressPercentage = (current: number, goal: number): number => {
    if (goal === 0) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundDecorations />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading client data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundDecorations />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.error} />
          <Text style={styles.errorText}>Client not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const bmi = calculateBMI();
  const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null;

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Client Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => {
            if (onNavigate) {
              onNavigate('client-progress-analytics', { clientId });
            } else {
              Alert.alert('Feature Coming Soon', 'Analytics will be available soon!');
            }
          }}>
            <MaterialIcons name="analytics" size={20} color={colors.info} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => {
            if (onNavigate) {
              onNavigate('client-workout-plans', { clientId });
            } else {
              Alert.alert('Feature Coming Soon', 'Workout plans will be available soon!');
            }
          }}>
            <MaterialIcons name="fitness-center" size={20} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => {
            if (onNavigate) {
              onNavigate('create-nutrition-plan', { clientId });
            } else {
              Alert.alert('Feature Coming Soon', 'Nutrition plans will be available soon!');
            }
          }}>
            <MaterialIcons name="restaurant" size={20} color={colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerNotesButton} onPress={handleViewNotes}>
            <MaterialIcons name="note-add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Debug buttons - remove these later */}
      <TouchableOpacity 
        style={{backgroundColor: 'red', padding: 10, margin: 10}}
        onPress={() => {
          console.log('DEBUG: Test button pressed!');
          Alert.alert('Debug', 'Test button works!');
        }}
      >
        <Text style={{color: 'white', textAlign: 'center'}}>DEBUG: Test Button</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={{backgroundColor: 'orange', padding: 10, margin: 10}}
        onPress={handleReassignClient}
      >
        <Text style={{color: 'white', textAlign: 'center'}}>DEBUG: Direct Unassign</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryLight] as [string, string, ...string[]]}
          style={styles.profileCard}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {profile.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>{profile.full_name}</Text>
          <View style={styles.profileMetaRow}>
            {profile.age && (
              <View style={styles.profileMetaItem}>
                <MaterialIcons name="cake" size={16} color={colors.textLight} />
                <Text style={styles.profileMetaText}>{profile.age} years</Text>
              </View>
            )}
            <View style={styles.profileMetaItem}>
              <MaterialIcons name="fitness-center" size={16} color={colors.textLight} />
              <Text style={styles.profileMetaText}>
                {profile.fitness_level.charAt(0).toUpperCase() + profile.fitness_level.slice(1)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {(profile.height || profile.weight || profile.gender) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Physical Stats</Text>
            <View style={styles.statsGrid}>
              {profile.height && (
                <View style={styles.statItem}>
                  <MaterialIcons name="height" size={24} color={colors.primary} />
                  <Text style={styles.statValue}>{profile.height} cm</Text>
                  <Text style={styles.statLabel}>Height</Text>
                </View>
              )}
              {profile.weight && (
                <View style={styles.statItem}>
                  <MaterialIcons name="monitor-weight" size={24} color={colors.primary} />
                  <Text style={styles.statValue}>{profile.weight} kg</Text>
                  <Text style={styles.statLabel}>Weight</Text>
                </View>
              )}
              {bmi && (
                <View style={styles.statItem}>
                  <MaterialIcons name="analytics" size={24} color={bmiCategory?.color} />
                  <Text style={[styles.statValue, { color: bmiCategory?.color }]}>{bmi}</Text>
                  <Text style={styles.statLabel}>{bmiCategory?.text}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {weeklyGoal && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Progress</Text>
            
            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <View style={styles.progressTitleRow}>
                  <MaterialIcons name="fitness-center" size={20} color={colors.primary} />
                  <Text style={styles.progressTitle}>Workouts</Text>
                </View>
                <Text style={styles.progressValue}>
                  {weeklyGoal.workouts_current}/{weeklyGoal.workouts_goal}
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${getProgressPercentage(weeklyGoal.workouts_current, weeklyGoal.workouts_goal)}%` }
                  ]}
                />
              </View>
            </View>

            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <View style={styles.progressTitleRow}>
                  <MaterialIcons name="water-drop" size={20} color={colors.info} />
                  <Text style={styles.progressTitle}>Water</Text>
                </View>
                <Text style={styles.progressValue}>
                  {weeklyGoal.water_current}/{weeklyGoal.water_goal} glasses
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { 
                      width: `${getProgressPercentage(weeklyGoal.water_current, weeklyGoal.water_goal)}%`,
                      backgroundColor: colors.info 
                    }
                  ]}
                />
              </View>
            </View>

            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <View style={styles.progressTitleRow}>
                  <MaterialIcons name="local-fire-department" size={20} color={colors.warning} />
                  <Text style={styles.progressTitle}>Calories</Text>
                </View>
                <Text style={styles.progressValue}>
                  {weeklyGoal.calories_current}/{weeklyGoal.calories_goal} kcal
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { 
                      width: `${getProgressPercentage(weeklyGoal.calories_current, weeklyGoal.calories_goal)}%`,
                      backgroundColor: colors.warning 
                    }
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {profile.fitness_goals && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fitness Goals</Text>
            <View style={styles.card}>
              <Text style={styles.cardText}>{profile.fitness_goals}</Text>
            </View>
          </View>
        )}

        {profile.health_notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health Notes</Text>
            <View style={styles.card}>
              <Text style={styles.cardText}>{profile.health_notes}</Text>
            </View>
          </View>
        )}

        {coachData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assignment Info</Text>
            <View style={styles.card}>
              {assignment ? (
                <>
                  <View style={styles.assignmentRow}>
                    <MaterialIcons name="event" size={18} color={colors.textSecondary} />
                    <Text style={styles.assignmentText}>
                      Assigned on {new Date(assignment.assigned_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {assignment.notes && (
                    <Text style={[styles.cardText, { marginTop: spacing.sm }]}>
                      {assignment.notes}
                    </Text>
                  )}
                </>
              ) : (
                <View style={styles.assignmentRow}>
                  <MaterialIcons name="info" size={18} color={colors.textSecondary} />
                  <Text style={styles.assignmentText}>
                    Assignment details not available
                  </Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.reassignButton}
                onPress={() => {
                  console.log('🚨 UNASSIGN BUTTON PRESSED!');
                  Alert.alert('DEBUG', 'Unassign button was pressed!');
                  handleReassignClient();
                }}
              >
                <MaterialIcons name="swap-horiz" size={20} color={colors.warning} />
                <Text style={styles.reassignButtonText}>Unassign Client</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {profile.phone && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.card}>
              <View style={styles.assignmentRow}>
                <MaterialIcons name="phone" size={18} color={colors.primary} />
                <Text style={styles.cardText}>{profile.phone}</Text>
              </View>
            </View>
          </View>
        )}

        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bio</Text>
            <View style={styles.card}>
              <Text style={styles.cardText}>{profile.bio}</Text>
            </View>
          </View>
        )}

        {profile.goals && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Goals</Text>
            <View style={styles.card}>
              <Text style={styles.cardText}>{profile.goals}</Text>
            </View>
          </View>
        )}

        {healthMetrics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health Metrics (Last 7 Days)</Text>
            {healthMetrics.map((metric, index) => (
              <View key={index} style={[styles.card, { marginBottom: spacing.md }]}>
                <Text style={styles.metricDate}>
                  {new Date(metric.date).toLocaleDateString()}
                </Text>
                <View style={styles.statsGrid}>
                  {metric.steps > 0 && (
                    <View style={styles.statItem}>
                      <MaterialIcons name="directions-walk" size={20} color={colors.primary} />
                      <Text style={styles.statValue}>{metric.steps}</Text>
                      <Text style={styles.statLabel}>Steps</Text>
                    </View>
                  )}
                  {metric.calories_burned > 0 && (
                    <View style={styles.statItem}>
                      <MaterialIcons name="local-fire-department" size={20} color={colors.warning} />
                      <Text style={styles.statValue}>{metric.calories_burned}</Text>
                      <Text style={styles.statLabel}>Calories</Text>
                    </View>
                  )}
                  {metric.water_intake > 0 && (
                    <View style={styles.statItem}>
                      <MaterialIcons name="water-drop" size={20} color={colors.info} />
                      <Text style={styles.statValue}>{metric.water_intake}</Text>
                      <Text style={styles.statLabel}>Water (L)</Text>
                    </View>
                  )}
                </View>
                <View style={styles.statsGrid}>
                  {metric.sleep_hours > 0 && (
                    <View style={styles.statItem}>
                      <MaterialIcons name="bedtime" size={20} color={colors.secondary} />
                      <Text style={styles.statValue}>{metric.sleep_hours}</Text>
                      <Text style={styles.statLabel}>Sleep (h)</Text>
                    </View>
                  )}
                  {metric.exercise_minutes > 0 && (
                    <View style={styles.statItem}>
                      <MaterialIcons name="fitness-center" size={20} color={colors.primary} />
                      <Text style={styles.statValue}>{metric.exercise_minutes}</Text>
                      <Text style={styles.statLabel}>Exercise (min)</Text>
                    </View>
                  )}
                  {metric.weight_kg > 0 && (
                    <View style={styles.statItem}>
                      <MaterialIcons name="monitor-weight" size={20} color={colors.accent} />
                      <Text style={styles.statValue}>{metric.weight_kg}</Text>
                      <Text style={styles.statLabel}>Weight (kg)</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {activityLogs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            {activityLogs.map((activity) => (
              <View key={activity.id} style={[styles.card, { marginBottom: spacing.md }]}>
                <View style={styles.activityHeader}>
                  <View style={styles.activityTitleRow}>
                    <MaterialIcons 
                      name={
                        activity.activity_type === 'workout' ? 'fitness-center' :
                        activity.activity_type === 'meal' ? 'restaurant' :
                        activity.activity_type === 'mindfulness' ? 'self-improvement' :
                        'event'
                      } 
                      size={20} 
                      color={
                        activity.status === 'completed' ? colors.success :
                        activity.status === 'failed' ? colors.error :
                        colors.textSecondary
                      }
                    />
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                  </View>
                  <Text style={[
                    styles.activityStatus,
                    { color: activity.status === 'completed' ? colors.success : colors.textSecondary }
                  ]}>
                    {activity.status}
                  </Text>
                </View>
                <View style={styles.activityMeta}>
                  <Text style={styles.activityMetaText}>
                    {new Date(activity.date).toLocaleDateString()}
                  </Text>
                  {activity.duration && (
                    <Text style={styles.activityMetaText}>
                      {activity.duration} min
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {meals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Meals</Text>
            {meals.map((meal) => (
              <View key={meal.id} style={[styles.card, { marginBottom: spacing.md }]}>
                <View style={styles.activityHeader}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealType}>{meal.meal_type}</Text>
                </View>
                <View style={styles.macrosGrid}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>{meal.calories}</Text>
                    <Text style={styles.macroLabel}>cal</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>{meal.protein}g</Text>
                    <Text style={styles.macroLabel}>protein</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>{meal.carbs}g</Text>
                    <Text style={styles.macroLabel}>carbs</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>{meal.fats}g</Text>
                    <Text style={styles.macroLabel}>fats</Text>
                  </View>
                </View>
                <Text style={styles.mealDateTime}>
                  {new Date(meal.date).toLocaleDateString()} at {meal.time}
                </Text>
              </View>
            ))}
          </View>
        )}

        {profile.created_at && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <View style={styles.card}>
              <View style={styles.assignmentRow}>
                <MaterialIcons name="person-add" size={18} color={colors.textSecondary} />
                <Text style={styles.assignmentText}>
                  Joined {new Date(profile.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={[styles.assignmentRow, { marginTop: spacing.sm }]}>
                <MaterialIcons name="wc" size={18} color={colors.textSecondary} />
                <Text style={styles.assignmentText}>
                  Gender: {profile.gender}
                </Text>
              </View>
            </View>
          </View>
        )}
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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  headerNotesButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.error,
    marginTop: spacing.md,
  },
  backButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  backButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileAvatarText: {
    fontSize: 36,
    fontFamily: 'Poppins_700Bold',
    color: colors.textLight,
  },
  profileName: {
    fontSize: fontSizes.xxl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  profileMetaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  profileMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  profileMetaText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textLight,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  progressItem: {
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  progressValue: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textSecondary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  cardText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  assignmentText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  reassignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  reassignButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.warning,
  },
  metricDate: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  activityTitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  activityStatus: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    textTransform: 'capitalize',
  },
  activityMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  activityMetaText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  mealName: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  mealType: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.md,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  macroLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  mealDateTime: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
});
