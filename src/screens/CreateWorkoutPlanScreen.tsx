import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BackgroundDecorations } from '../components';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useWorkoutPlans } from '../hooks/useWorkoutPlans';

interface CreateWorkoutPlanScreenProps {
  route?: any;
  navigation?: any;
  clientId?: string;
  onBack?: () => void;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  instructions: string;
  equipment_needed?: string;
}

interface WorkoutExercise {
  exercise: Exercise;
  sets: number;
  reps: string;
  rest_seconds?: number;
  notes?: string;
}

interface WorkoutDay {
  id: string;
  name: string;
  description: string;
  exercises: WorkoutExercise[];
}

const EXERCISE_DATABASE: Exercise[] = [
  {
    id: '1',
    name: 'Push-ups',
    category: 'Strength',
    muscle_groups: ['Chest', 'Shoulders', 'Triceps'],
    instructions: 'Start in plank position, lower body to ground, push back up',
    equipment_needed: 'None'
  },
  {
    id: '2', 
    name: 'Squats',
    category: 'Strength',
    muscle_groups: ['Quadriceps', 'Glutes', 'Hamstrings'],
    instructions: 'Stand with feet shoulder-width apart, lower hips back and down, return to standing',
    equipment_needed: 'None'
  },
  {
    id: '3',
    name: 'Deadlifts',
    category: 'Strength', 
    muscle_groups: ['Hamstrings', 'Glutes', 'Lower Back'],
    instructions: 'Stand with barbell over feet, bend at hips and knees, lift by extending hips',
    equipment_needed: 'Barbell'
  },
  {
    id: '4',
    name: 'Running',
    category: 'Cardio',
    muscle_groups: ['Legs', 'Cardiovascular'],
    instructions: 'Maintain steady pace, proper form, controlled breathing',
    equipment_needed: 'None'
  },
  {
    id: '5',
    name: 'Planks',
    category: 'Core',
    muscle_groups: ['Core', 'Shoulders', 'Back'],
    instructions: 'Hold plank position with straight line from head to heels',
    equipment_needed: 'None'
  },
  {
    id: '6',
    name: 'Pull-ups',
    category: 'Strength',
    muscle_groups: ['Lats', 'Biceps', 'Shoulders'],
    instructions: 'Hang from bar, pull body up until chin over bar, lower with control',
    equipment_needed: 'Pull-up bar'
  }
];

const WORKOUT_TEMPLATES = [
  {
    id: 'beginner-full-body',
    name: 'Beginner Full Body',
    description: 'Perfect for fitness newcomers',
    workouts: [
      {
        id: '1',
        name: 'Full Body Workout A',
        description: 'Upper and lower body exercises',
        exercises: [
          { exercise: EXERCISE_DATABASE[0], sets: 2, reps: '8-12' },
          { exercise: EXERCISE_DATABASE[1], sets: 2, reps: '10-15' },
          { exercise: EXERCISE_DATABASE[4], sets: 2, reps: '20-30 seconds' }
        ]
      },
      {
        id: '2', 
        name: 'Full Body Workout B',
        description: 'Alternative full body routine',
        exercises: [
          { exercise: EXERCISE_DATABASE[5], sets: 2, reps: '5-10' },
          { exercise: EXERCISE_DATABASE[2], sets: 2, reps: '8-12' },
          { exercise: EXERCISE_DATABASE[3], sets: 1, reps: '15-20 minutes' }
        ]
      }
    ]
  },
  {
    id: 'intermediate-split',
    name: 'Intermediate Push/Pull',
    description: 'Split routine for intermediate lifters',
    workouts: [
      {
        id: '1',
        name: 'Push Day',
        description: 'Chest, shoulders, triceps',
        exercises: [
          { exercise: EXERCISE_DATABASE[0], sets: 3, reps: '8-12' },
          { exercise: EXERCISE_DATABASE[1], sets: 3, reps: '12-15' }
        ]
      },
      {
        id: '2',
        name: 'Pull Day', 
        description: 'Back, biceps, hamstrings',
        exercises: [
          { exercise: EXERCISE_DATABASE[5], sets: 3, reps: '6-10' },
          { exercise: EXERCISE_DATABASE[2], sets: 3, reps: '8-12' }
        ]
      }
    ]
  }
];

export const CreateWorkoutPlanScreen: React.FC<CreateWorkoutPlanScreenProps> = ({
  route,
  navigation,
  clientId: propClientId,
  onBack,
}) => {
  const { coachData } = useAuth();
  const clientId = propClientId || route?.params?.clientId;

  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const exerciseCategories = ['All', 'Strength', 'Cardio', 'Core', 'Flexibility'];

  const filteredExercises = EXERCISE_DATABASE.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exercise.muscle_groups.some(mg => mg.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || selectedCategory === 'All' || exercise.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addWorkoutDay = () => {
    const newDay: WorkoutDay = {
      id: Date.now().toString(),
      name: `Day ${workoutDays.length + 1}`,
      description: '',
      exercises: []
    };
    setWorkoutDays([...workoutDays, newDay]);
  };

  const updateWorkoutDay = (index: number, updates: Partial<WorkoutDay>) => {
    const updated = [...workoutDays];
    updated[index] = { ...updated[index], ...updates };
    setWorkoutDays(updated);
  };

  const removeWorkoutDay = (index: number) => {
    const updated = workoutDays.filter((_, i) => i !== index);
    setWorkoutDays(updated);
  };

  const addExerciseToDay = (dayIndex: number, exercise: Exercise) => {
    const newWorkoutExercise: WorkoutExercise = {
      exercise,
      sets: 3,
      reps: '8-12',
      rest_seconds: 60
    };
    
    const updated = [...workoutDays];
    updated[dayIndex].exercises.push(newWorkoutExercise);
    setWorkoutDays(updated);
    setShowExerciseModal(false);
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, updates: Partial<WorkoutExercise>) => {
    const updated = [...workoutDays];
    updated[dayIndex].exercises[exerciseIndex] = { ...updated[dayIndex].exercises[exerciseIndex], ...updates };
    setWorkoutDays(updated);
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const updated = [...workoutDays];
    updated[dayIndex].exercises.splice(exerciseIndex, 1);
    setWorkoutDays(updated);
  };

  const loadTemplate = (template: typeof WORKOUT_TEMPLATES[0]) => {
    setPlanName(template.name);
    setPlanDescription(template.description);
    setWorkoutDays(template.workouts);
    setShowTemplateModal(false);
  };

  const { createWorkoutPlan } = useWorkoutPlans();

  const savePlan = async () => {
    if (!planName.trim()) {
      Alert.alert('Error', 'Please enter a plan name');
      return;
    }

    if (workoutDays.length === 0) {
      Alert.alert('Error', 'Please add at least one workout day');
      return;
    }

    if (!coachData?.id) {
      Alert.alert('Error', 'Coach data not found');
      return;
    }

    try {
      const planData = {
        coach_id: coachData.id,
        client_id: clientId,
        name: planName,
        description: planDescription,
        workout_days: workoutDays,
        is_active: true
      };

      await createWorkoutPlan(planData);

      Alert.alert('Success', 'Workout plan created successfully!', [
        { text: 'OK', onPress: () => handleBack() }
      ]);
    } catch (error) {
      console.error('Error saving workout plan:', error);
      Alert.alert('Error', 'Failed to save workout plan. Please try again.');
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Workout Plan</Text>
        <TouchableOpacity style={styles.templateButton} onPress={() => setShowTemplateModal(true)}>
          <MaterialIcons name="library-books" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Plan Name</Text>
            <TextInput
              style={styles.textInput}
              value={planName}
              onChangeText={setPlanName}
              placeholder="e.g., Beginner Strength Program"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={planDescription}
              onChangeText={setPlanDescription}
              placeholder="Describe the program goals and approach..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Workout Days</Text>
            <TouchableOpacity style={styles.addButton} onPress={addWorkoutDay}>
              <MaterialIcons name="add" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {workoutDays.map((day, dayIndex) => (
            <View key={day.id} style={styles.workoutDayCard}>
              <View style={styles.dayHeader}>
                <TextInput
                  style={styles.dayNameInput}
                  value={day.name}
                  onChangeText={(text) => updateWorkoutDay(dayIndex, { name: text })}
                  placeholder="Workout name"
                />
                <TouchableOpacity onPress={() => removeWorkoutDay(dayIndex)}>
                  <MaterialIcons name="delete" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.dayDescriptionInput}
                value={day.description}
                onChangeText={(text) => updateWorkoutDay(dayIndex, { description: text })}
                placeholder="Workout description"
                placeholderTextColor={colors.textSecondary}
              />

              <View style={styles.exercisesList}>
                {day.exercises.map((workoutExercise, exerciseIndex) => (
                  <View key={exerciseIndex} style={styles.exerciseItem}>
                    <View style={styles.exerciseHeader}>
                      <Text style={styles.exerciseName}>{workoutExercise.exercise.name}</Text>
                      <TouchableOpacity onPress={() => removeExercise(dayIndex, exerciseIndex)}>
                        <MaterialIcons name="close" size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.exerciseDetails}>
                      <View style={styles.exerciseInputGroup}>
                        <Text style={styles.exerciseInputLabel}>Sets</Text>
                        <TextInput
                          style={styles.exerciseInput}
                          value={workoutExercise.sets.toString()}
                          onChangeText={(text) => updateExercise(dayIndex, exerciseIndex, { sets: parseInt(text) || 0 })}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.exerciseInputGroup}>
                        <Text style={styles.exerciseInputLabel}>Reps</Text>
                        <TextInput
                          style={styles.exerciseInput}
                          value={workoutExercise.reps}
                          onChangeText={(text) => updateExercise(dayIndex, exerciseIndex, { reps: text })}
                          placeholder="8-12"
                        />
                      </View>
                      <View style={styles.exerciseInputGroup}>
                        <Text style={styles.exerciseInputLabel}>Rest (s)</Text>
                        <TextInput
                          style={styles.exerciseInput}
                          value={workoutExercise.rest_seconds?.toString() || ''}
                          onChangeText={(text) => updateExercise(dayIndex, exerciseIndex, { rest_seconds: parseInt(text) || undefined })}
                          keyboardType="numeric"
                          placeholder="60"
                        />
                      </View>
                    </View>

                    <Text style={styles.muscleGroups}>
                      {workoutExercise.exercise.muscle_groups.join(', ')}
                    </Text>
                  </View>
                ))}

                <TouchableOpacity 
                  style={styles.addExerciseButton}
                  onPress={() => {
                    setSelectedDayIndex(dayIndex);
                    setShowExerciseModal(true);
                  }}
                >
                  <MaterialIcons name="add" size={20} color={colors.primary} />
                  <Text style={styles.addExerciseText}>Add Exercise</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {workoutDays.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="fitness-center" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No workout days yet</Text>
              <Text style={styles.emptyStateSubtext}>Add workout days to build your plan</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={savePlan}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight] as [string, string, ...string[]]}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>Save Workout Plan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Exercise Selection Modal */}
      <Modal
        visible={showExerciseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExerciseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Exercise</Text>
              <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises..."
              placeholderTextColor={colors.textSecondary}
            />

            <ScrollView horizontal style={styles.categoryContainer} showsHorizontalScrollIndicator={false}>
              {exerciseCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category && styles.categoryChipActive
                  ]}
                  onPress={() => setSelectedCategory(category === 'All' ? null : category)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory === category && styles.categoryChipTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.id}
              style={styles.exerciseList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.exerciseModalItem}
                  onPress={() => selectedDayIndex !== null && addExerciseToDay(selectedDayIndex, item)}
                >
                  <View style={styles.exerciseModalInfo}>
                    <Text style={styles.exerciseModalName}>{item.name}</Text>
                    <Text style={styles.exerciseModalMuscles}>
                      {item.muscle_groups.join(', ')}
                    </Text>
                    <Text style={styles.exerciseModalCategory}>{item.category}</Text>
                  </View>
                  <MaterialIcons name="add-circle-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {}
      <Modal
        visible={showTemplateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Template</Text>
              <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {WORKOUT_TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateItem}
                  onPress={() => loadTemplate(template)}
                >
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateDescription}>{template.description}</Text>
                  <Text style={styles.templateWorkouts}>
                    {template.workouts.length} workout{template.workouts.length !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  templateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
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
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  workoutDayCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dayNameInput: {
    flex: 1,
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginRight: spacing.md,
  },
  dayDescriptionInput: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  exercisesList: {
    gap: spacing.md,
  },
  exerciseItem: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
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
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  exerciseInputGroup: {
    flex: 1,
  },
  exerciseInputLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  exerciseInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleGroups: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addExerciseText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  saveButton: {
    marginTop: spacing.xl,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  saveButtonGradient: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryContainer: {
    marginBottom: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.textLight,
  },
  exerciseList: {
    flex: 1,
  },
  exerciseModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exerciseModalInfo: {
    flex: 1,
  },
  exerciseModalName: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  exerciseModalMuscles: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  exerciseModalCategory: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.primary,
  },
  templateItem: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  templateName: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  templateDescription: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  templateWorkouts: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
  },
});