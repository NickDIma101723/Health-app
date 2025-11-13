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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BackgroundDecorations } from '../components';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { useWorkoutPlans, WorkoutPlan } from '../hooks/useWorkoutPlans';
import { useAuth } from '../contexts/AuthContext';

interface ClientWorkoutPlansScreenProps {
  route?: any;
  navigation?: any;
  clientId?: string;
  onBack?: () => void;
  onNavigate?: (screen: string, params?: any) => void;
}

export const ClientWorkoutPlansScreen: React.FC<ClientWorkoutPlansScreenProps> = ({
  route,
  navigation,
  clientId: propClientId,
  onBack,
  onNavigate,
}) => {
  const { coachData } = useAuth();
  const clientId = propClientId || route?.params?.clientId;
  const { workoutPlans, loading, fetchWorkoutPlans, deleteWorkoutPlan } = useWorkoutPlans();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    if (clientId) {
      fetchWorkoutPlans(clientId);
    }
  }, [clientId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWorkoutPlans(clientId);
    setRefreshing(false);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const handleCreatePlan = () => {
    if (onNavigate) {
      onNavigate('create-workout-plan', { clientId });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    Alert.alert(
      'Delete Workout Plan',
      'Are you sure you want to delete this workout plan? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkoutPlan(planId);
              Alert.alert('Success', 'Workout plan deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete workout plan');
            }
          }
        }
      ]
    );
  };

  const getExerciseCount = (plan: WorkoutPlan): number => {
    return plan.workout_days.reduce((total, day) => total + day.exercises.length, 0);
  };

  const getTotalWorkoutDays = (plan: WorkoutPlan): number => {
    return plan.workout_days.length;
  };

  if (loading && workoutPlans.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundDecorations />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading workout plans...</Text>
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
        <Text style={styles.headerTitle}>Workout Plans</Text>
        {coachData && (
          <TouchableOpacity style={styles.headerAddButton} onPress={handleCreatePlan}>
            <MaterialIcons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {workoutPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="fitness-center" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No Workout Plans</Text>
            <Text style={styles.emptyStateText}>
              {coachData 
                ? 'Create workout plans to help your client achieve their fitness goals.'
                : 'Your coach will create personalized workout plans for you.'
              }
            </Text>
            {coachData && (
              <TouchableOpacity style={styles.createFirstPlanButton} onPress={handleCreatePlan}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight] as [string, string, ...string[]]}
                  style={styles.createFirstPlanGradient}
                >
                  <MaterialIcons name="add" size={20} color={colors.textLight} />
                  <Text style={styles.createFirstPlanText}>Create First Plan</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.plansList}>
            {workoutPlans.map((plan) => (
              <View key={plan.id} style={styles.planCard}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight] as [string, string, ...string[]]}
                  style={styles.planCardHeader}
                >
                  <View style={styles.planHeaderContent}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {plan.description && (
                      <Text style={styles.planDescription}>{plan.description}</Text>
                    )}
                  </View>
                  {coachData && (
                    <TouchableOpacity 
                      style={styles.planDeleteButton}
                      onPress={() => handleDeletePlan(plan.id)}
                    >
                      <MaterialIcons name="delete" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                  )}
                </LinearGradient>

                <View style={styles.planStatsContainer}>
                  <View style={styles.planStat}>
                    <MaterialIcons name="fitness-center" size={20} color={colors.primary} />
                    <Text style={styles.planStatValue}>{getExerciseCount(plan)}</Text>
                    <Text style={styles.planStatLabel}>Exercises</Text>
                  </View>
                  <View style={styles.planStat}>
                    <MaterialIcons name="event" size={20} color={colors.success} />
                    <Text style={styles.planStatValue}>{getTotalWorkoutDays(plan)}</Text>
                    <Text style={styles.planStatLabel}>Days</Text>
                  </View>
                  <View style={styles.planStat}>
                    <MaterialIcons name="schedule" size={20} color={colors.info} />
                    <Text style={styles.planStatValue}>
                      {new Date(plan.created_at).toLocaleDateString()}
                    </Text>
                    <Text style={styles.planStatLabel}>Created</Text>
                  </View>
                </View>

                <View style={styles.workoutDaysList}>
                  {plan.workout_days.map((day, dayIndex) => (
                    <TouchableOpacity
                      key={day.id}
                      style={styles.workoutDayItem}
                      onPress={() => setSelectedPlan(selectedPlan?.id === plan.id ? null : plan)}
                    >
                      <View style={styles.workoutDayHeader}>
                        <View style={styles.workoutDayInfo}>
                          <Text style={styles.workoutDayName}>{day.name}</Text>
                          {day.description && (
                            <Text style={styles.workoutDayDescription}>{day.description}</Text>
                          )}
                        </View>
                        <View style={styles.workoutDayMeta}>
                          <Text style={styles.workoutDayExerciseCount}>
                            {day.exercises.length} exercises
                          </Text>
                          <MaterialIcons 
                            name={selectedPlan?.id === plan.id ? "expand-less" : "expand-more"} 
                            size={20} 
                            color={colors.textSecondary} 
                          />
                        </View>
                      </View>

                      {selectedPlan?.id === plan.id && (
                        <View style={styles.exercisesList}>
                          {day.exercises.map((workoutExercise, exerciseIndex) => (
                            <View key={exerciseIndex} style={styles.exerciseItem}>
                              <View style={styles.exerciseHeader}>
                                <Text style={styles.exerciseName}>
                                  {workoutExercise.exercise.name}
                                </Text>
                                <Text style={styles.exerciseCategory}>
                                  {workoutExercise.exercise.category}
                                </Text>
                              </View>
                              
                              <View style={styles.exerciseDetails}>
                                <View style={styles.exerciseDetailItem}>
                                  <Text style={styles.exerciseDetailLabel}>Sets:</Text>
                                  <Text style={styles.exerciseDetailValue}>{workoutExercise.sets}</Text>
                                </View>
                                <View style={styles.exerciseDetailItem}>
                                  <Text style={styles.exerciseDetailLabel}>Reps:</Text>
                                  <Text style={styles.exerciseDetailValue}>{workoutExercise.reps}</Text>
                                </View>
                                {workoutExercise.rest_seconds && (
                                  <View style={styles.exerciseDetailItem}>
                                    <Text style={styles.exerciseDetailLabel}>Rest:</Text>
                                    <Text style={styles.exerciseDetailValue}>{workoutExercise.rest_seconds}s</Text>
                                  </View>
                                )}
                              </View>

                              <Text style={styles.muscleGroups}>
                                Target: {workoutExercise.exercise.muscle_groups.join(', ')}
                              </Text>

                              {workoutExercise.exercise.instructions && (
                                <Text style={styles.exerciseInstructions}>
                                  {workoutExercise.exercise.instructions}
                                </Text>
                              )}

                              {workoutExercise.notes && (
                                <View style={styles.exerciseNotesContainer}>
                                  <MaterialIcons name="note" size={16} color={colors.info} />
                                  <Text style={styles.exerciseNotes}>{workoutExercise.notes}</Text>
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
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
  headerAddButton: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    lineHeight: fontSizes.md * 1.6,
  },
  createFirstPlanButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  createFirstPlanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  createFirstPlanText: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textLight,
  },
  plansList: {
    gap: spacing.lg,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  planCardHeader: {
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planHeaderContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  planName: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  planDescription: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textLight,
    opacity: 0.9,
  },
  planDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  planStat: {
    flex: 1,
    alignItems: 'center',
  },
  planStatValue: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginVertical: spacing.xs,
  },
  planStatLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  workoutDaysList: {
    padding: spacing.lg,
  },
  workoutDayItem: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  workoutDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  workoutDayInfo: {
    flex: 1,
  },
  workoutDayName: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  workoutDayDescription: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  workoutDayMeta: {
    alignItems: 'flex-end',
  },
  workoutDayExerciseCount: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  exercisesList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exerciseItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exerciseName: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    flex: 1,
  },
  exerciseCategory: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.primary,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  exerciseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  exerciseDetailLabel: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  exerciseDetailValue: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  muscleGroups: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  exerciseInstructions: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textPrimary,
    lineHeight: fontSizes.sm * 1.5,
    marginBottom: spacing.sm,
  },
  exerciseNotesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.info + '20',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  exerciseNotes: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.info,
  },
});