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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BackgroundDecorations } from '../components';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface CreateNutritionPlanScreenProps {
  route?: any;
  navigation?: any;
  clientId?: string;
  onBack?: () => void;
}

interface Recipe {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  instructions: string;
  prep_time: number;
  serving_size: string;
}

interface MealPlan {
  id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe: Recipe;
  day_of_week: number; // 0-6, Sunday = 0
  portion_size: number;
  notes?: string;
}

interface NutritionPlan {
  name: string;
  description: string;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fats: number;
  meal_plans: MealPlan[];
}

const SAMPLE_RECIPES: Recipe[] = [
  {
    id: '1',
    name: 'Grilled Chicken Breast',
    category: 'Protein',
    calories: 231,
    protein: 43.5,
    carbs: 0,
    fats: 5.0,
    ingredients: ['Chicken breast', 'Olive oil', 'Salt', 'Pepper', 'Garlic powder'],
    instructions: 'Season chicken breast and grill for 6-8 minutes per side until cooked through.',
    prep_time: 15,
    serving_size: '150g'
  },
  {
    id: '2',
    name: 'Brown Rice Bowl',
    category: 'Carbs',
    calories: 218,
    protein: 4.5,
    carbs: 45,
    fats: 1.6,
    ingredients: ['Brown rice', 'Water', 'Salt'],
    instructions: 'Cook brown rice according to package directions.',
    prep_time: 25,
    serving_size: '1 cup cooked'
  },
  {
    id: '3',
    name: 'Greek Yogurt Parfait',
    category: 'Breakfast',
    calories: 190,
    protein: 15,
    carbs: 25,
    fats: 4,
    ingredients: ['Greek yogurt', 'Berries', 'Granola', 'Honey'],
    instructions: 'Layer yogurt, berries, and granola. Drizzle with honey.',
    prep_time: 5,
    serving_size: '1 cup'
  },
  {
    id: '4',
    name: 'Salmon Fillet',
    category: 'Protein',
    calories: 367,
    protein: 25,
    carbs: 0,
    fats: 30,
    ingredients: ['Salmon fillet', 'Lemon', 'Dill', 'Salt', 'Pepper'],
    instructions: 'Bake salmon at 400°F for 12-15 minutes with seasonings.',
    prep_time: 20,
    serving_size: '150g'
  },
  {
    id: '5',
    name: 'Quinoa Salad',
    category: 'Carbs',
    calories: 222,
    protein: 8,
    carbs: 40,
    fats: 3.6,
    ingredients: ['Quinoa', 'Cucumber', 'Tomatoes', 'Red onion', 'Lemon vinaigrette'],
    instructions: 'Cook quinoa, cool, and mix with chopped vegetables and dressing.',
    prep_time: 20,
    serving_size: '1 cup'
  },
  {
    id: '6',
    name: 'Avocado Toast',
    category: 'Snack',
    calories: 234,
    protein: 6,
    carbs: 12,
    fats: 21,
    ingredients: ['Whole grain bread', 'Avocado', 'Salt', 'Pepper', 'Lemon juice'],
    instructions: 'Toast bread, mash avocado with seasonings, and spread on toast.',
    prep_time: 5,
    serving_size: '1 slice'
  }
];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export const CreateNutritionPlanScreen: React.FC<CreateNutritionPlanScreenProps> = ({
  route,
  navigation,
  clientId: propClientId,
  onBack,
}) => {
  const { coachData } = useAuth();
  const clientId = propClientId || route?.params?.clientId;

  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [targetCalories, setTargetCalories] = useState('2000');
  const [targetProtein, setTargetProtein] = useState('150');
  const [targetCarbs, setTargetCarbs] = useState('200');
  const [targetFats, setTargetFats] = useState('65');
  
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const recipeCategories = ['All', 'Breakfast', 'Protein', 'Carbs', 'Snack', 'Vegetable'];

  const filteredRecipes = SAMPLE_RECIPES.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || selectedCategory === 'All' || recipe.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addMealToDay = (day: number, mealType: typeof MEAL_TYPES[number], recipe: Recipe) => {
    const newMealPlan: MealPlan = {
      id: Date.now().toString() + Math.random(),
      meal_type: mealType,
      recipe,
      day_of_week: day,
      portion_size: 1,
      notes: ''
    };
    
    setMealPlans([...mealPlans, newMealPlan]);
    setShowRecipeModal(false);
  };

  const removeMeal = (mealId: string) => {
    setMealPlans(mealPlans.filter(meal => meal.id !== mealId));
  };

  const updateMealPortion = (mealId: string, portion: number) => {
    setMealPlans(mealPlans.map(meal => 
      meal.id === mealId ? { ...meal, portion_size: portion } : meal
    ));
  };

  const getMealsForDay = (day: number) => {
    return mealPlans.filter(meal => meal.day_of_week === day);
  };

  const getDayTotalNutrition = (day: number) => {
    const dayMeals = getMealsForDay(day);
    return dayMeals.reduce((total, meal) => ({
      calories: total.calories + (meal.recipe.calories * meal.portion_size),
      protein: total.protein + (meal.recipe.protein * meal.portion_size),
      carbs: total.carbs + (meal.recipe.carbs * meal.portion_size),
      fats: total.fats + (meal.recipe.fats * meal.portion_size),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  };

  const savePlan = async () => {
    if (!planName.trim()) {
      Alert.alert('Error', 'Please enter a plan name');
      return;
    }

    if (mealPlans.length === 0) {
      Alert.alert('Error', 'Please add at least one meal to the plan');
      return;
    }

    try {
      const nutritionPlan = {
        coach_id: coachData?.id,
        client_id: clientId,
        name: planName,
        description: planDescription,
        target_calories: parseInt(targetCalories) || 2000,
        target_protein: parseInt(targetProtein) || 150,
        target_carbs: parseInt(targetCarbs) || 200,
        target_fats: parseInt(targetFats) || 65,
        meal_plans: mealPlans,
        created_at: new Date().toISOString(),
        is_active: true
      };

      const { error } = await supabase
        .from('nutrition_plans')
        .insert(nutritionPlan);

      if (error) throw error;

      Alert.alert('Success', 'Nutrition plan created successfully!', [
        { text: 'OK', onPress: () => handleBack() }
      ]);
    } catch (error) {
      console.error('Error saving nutrition plan:', error);
      Alert.alert('Error', 'Failed to save nutrition plan. Please try again.');
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
        <Text style={styles.headerTitle}>Create Nutrition Plan</Text>
        <View style={styles.headerSpacer} />
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
              placeholder="e.g., Weight Loss Meal Plan"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={planDescription}
              onChangeText={setPlanDescription}
              placeholder="Describe the nutrition goals and approach..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <Text style={styles.subsectionTitle}>Daily Nutrition Targets</Text>
          <View style={styles.macrosContainer}>
            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>Calories</Text>
              <TextInput
                style={styles.macroInputField}
                value={targetCalories}
                onChangeText={setTargetCalories}
                keyboardType="numeric"
                placeholder="2000"
              />
            </View>
            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>Protein (g)</Text>
              <TextInput
                style={styles.macroInputField}
                value={targetProtein}
                onChangeText={setTargetProtein}
                keyboardType="numeric"
                placeholder="150"
              />
            </View>
            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>Carbs (g)</Text>
              <TextInput
                style={styles.macroInputField}
                value={targetCarbs}
                onChangeText={setTargetCarbs}
                keyboardType="numeric"
                placeholder="200"
              />
            </View>
            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>Fats (g)</Text>
              <TextInput
                style={styles.macroInputField}
                value={targetFats}
                onChangeText={setTargetFats}
                keyboardType="numeric"
                placeholder="65"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Meal Plan</Text>
          
          {DAYS_OF_WEEK.map((day, dayIndex) => {
            const dayNutrition = getDayTotalNutrition(dayIndex);
            const dayMeals = getMealsForDay(dayIndex);
            
            return (
              <View key={dayIndex} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayName}>{day}</Text>
                  <View style={styles.dayNutrition}>
                    <Text style={styles.dayCalories}>{Math.round(dayNutrition.calories)} cal</Text>
                    <Text style={styles.dayMacros}>
                      P:{Math.round(dayNutrition.protein)}g C:{Math.round(dayNutrition.carbs)}g F:{Math.round(dayNutrition.fats)}g
                    </Text>
                  </View>
                </View>

                <View style={styles.mealsContainer}>
                  {MEAL_TYPES.map((mealType) => {
                    const mealForType = dayMeals.find(meal => meal.meal_type === mealType);
                    
                    return (
                      <View key={mealType} style={styles.mealSlot}>
                        <View style={styles.mealTypeHeader}>
                          <Text style={styles.mealTypeTitle}>
                            {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                          </Text>
                          <TouchableOpacity
                            style={styles.addMealButton}
                            onPress={() => {
                              setSelectedDay(dayIndex);
                              setSelectedMealType(mealType);
                              setShowRecipeModal(true);
                            }}
                          >
                            <MaterialIcons name="add" size={16} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                        
                        {mealForType && (
                          <View style={styles.assignedMeal}>
                            <View style={styles.mealInfo}>
                              <Text style={styles.mealName}>{mealForType.recipe.name}</Text>
                              <Text style={styles.mealNutrition}>
                                {Math.round(mealForType.recipe.calories * mealForType.portion_size)} cal, 
                                P:{Math.round(mealForType.recipe.protein * mealForType.portion_size)}g
                              </Text>
                            </View>
                            <View style={styles.mealActions}>
                              <View style={styles.portionControls}>
                                <TouchableOpacity
                                  onPress={() => updateMealPortion(mealForType.id, Math.max(0.5, mealForType.portion_size - 0.5))}
                                  style={styles.portionButton}
                                >
                                  <MaterialIcons name="remove" size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                                <Text style={styles.portionText}>{mealForType.portion_size}x</Text>
                                <TouchableOpacity
                                  onPress={() => updateMealPortion(mealForType.id, mealForType.portion_size + 0.5)}
                                  style={styles.portionButton}
                                >
                                  <MaterialIcons name="add" size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                              </View>
                              <TouchableOpacity
                                onPress={() => removeMeal(mealForType.id)}
                                style={styles.removeMealButton}
                              >
                                <MaterialIcons name="close" size={16} color={colors.error} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={savePlan}>
          <LinearGradient
            colors={[colors.success, colors.primary] as [string, string, ...string[]]}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>Save Nutrition Plan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Recipe Selection Modal */}
      <Modal
        visible={showRecipeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRecipeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select Recipe for {DAYS_OF_WEEK[selectedDay]} {selectedMealType}
              </Text>
              <TouchableOpacity onPress={() => setShowRecipeModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search recipes..."
              placeholderTextColor={colors.textSecondary}
            />

            <ScrollView horizontal style={styles.categoryContainer} showsHorizontalScrollIndicator={false}>
              {recipeCategories.map((category) => (
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
              data={filteredRecipes}
              keyExtractor={(item) => item.id}
              style={styles.recipeList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.recipeItem}
                  onPress={() => addMealToDay(selectedDay, selectedMealType, item)}
                >
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName}>{item.name}</Text>
                    <Text style={styles.recipeNutrition}>
                      {item.calories} cal | P:{item.protein}g C:{item.carbs}g F:{item.fats}g
                    </Text>
                    <Text style={styles.recipeCategory}>{item.category} • {item.prep_time} min • {item.serving_size}</Text>
                  </View>
                  <MaterialIcons name="add-circle-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
              )}
            />
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
  headerSpacer: {
    width: 44,
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
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  subsectionTitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
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
  macrosContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroInput: {
    flex: 1,
  },
  macroLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  macroInputField: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayName: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  dayNutrition: {
    alignItems: 'flex-end',
  },
  dayCalories: {
    fontSize: fontSizes.sm,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  dayMacros: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  mealsContainer: {
    gap: spacing.sm,
  },
  mealSlot: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  mealTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  mealTypeTitle: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  addMealButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  assignedMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  mealNutrition: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  mealActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  portionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  portionButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portionText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    minWidth: 25,
    textAlign: 'center',
  },
  removeMealButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.md,
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
    backgroundColor: colors.success,
  },
  categoryChipText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.textLight,
  },
  recipeList: {
    flex: 1,
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  recipeNutrition: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  recipeCategory: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.success,
  },
});