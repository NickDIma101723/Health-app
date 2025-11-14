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
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import {
  BottomNavigation,
  BackgroundDecorations,
} from '../components';
import { RecipeBrowser } from '../components/RecipeBrowser';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { useNutritionAdapter } from '../hooks/useNutritionAdapter';
import { Meal } from '../contexts/NutritionContext';
import { useAuth } from '../contexts/AuthContext';
import { Recipe } from '../data/recipes';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = 140;

interface NutritionScreenProps {
  onNavigate?: (screen: string) => void;
}

const mealTypes = [
  { type: 'breakfast' as const, label: 'Breakfast', icon: 'wb-sunny', color: colors.accent },
  { type: 'lunch' as const, label: 'Lunch', icon: 'restaurant', color: colors.primary },
  { type: 'dinner' as const, label: 'Dinner', icon: 'dinner-dining', color: colors.secondary },
  { type: 'snack' as const, label: 'Snack', icon: 'cookie', color: colors.purple },
];

const quickWaterAmounts = [250, 350, 500, 750];

export const NutritionScreen: React.FC<NutritionScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const {
    meals,
    waterIntakes,
    goals,
    getDailyNutrition,
    addMeal,
    deleteMeal,
    addWaterIntake,
    deleteWaterIntake,
    updateGoals,
    refetch,
  } = useNutritionAdapter();

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate] = useState(today);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showRecipeBrowser, setShowRecipeBrowser] = useState(false);
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [showMealDetail, setShowMealDetail] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [mealRemindersEnabled, setMealRemindersEnabled] = useState(false);
  
  useEffect(() => {
    const loadMealRemindersPreference = async () => {
      if (!user) return;
      try {
        const key = `meal_reminders_${user.id}`;
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
          setMealRemindersEnabled(value === 'true');
        }
      } catch (error) {
        console.error('Failed to load meal reminders preference:', error);
      }
    };
    loadMealRemindersPreference();
  }, [user]);

  const toggleMealReminders = async () => {
    const newValue = !mealRemindersEnabled;
    setMealRemindersEnabled(newValue);
    
    if (user) {
      try {
        const key = `meal_reminders_${user.id}`;
        await AsyncStorage.setItem(key, newValue.toString());
      } catch (error) {
        console.error('Failed to save meal reminders preference:', error);
      }
    }
  };
  
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const modalSlideAnim = useRef(new Animated.Value(300)).current;
  const [refreshKey, setRefreshKey] = useState(0);

  const dailyNutrition = getDailyNutrition(selectedDate);
  
  const caloriesProgress = Math.min((dailyNutrition.calories / goals.calories) * 100, 100);
  const proteinProgress = Math.min((dailyNutrition.protein / goals.protein) * 100, 100);
  const carbsProgress = Math.min((dailyNutrition.carbs / goals.carbs) * 100, 100);
  const fatsProgress = Math.min((dailyNutrition.fats / goals.fats) * 100, 100);
  const waterProgress = Math.min((dailyNutrition.water / goals.water) * 100, 100);

  const waterGlasses = Math.floor(dailyNutrition.water / 250);
  const totalGlasses = Math.ceil(goals.water / 250);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [meals.length, waterIntakes.length]);

  useEffect(() => {
    if (showAddMeal) {
      Animated.timing(modalSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      modalSlideAnim.setValue(300);
    }
  }, [showAddMeal]);

  const handleAddMeal = async () => {
    if (!mealName.trim() || !calories) {
      Alert.alert('Missing Information', 'Please enter meal name and calories.');
      return;
    }

    const now = new Date();
    await addMeal({
      name: mealName,
      type: mealType,
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fats: parseInt(fats) || 0,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      date: selectedDate,
    });

    setMealName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    setShowAddMeal(false);
  };

  const handleAddWater = async (amount: number) => {
    await addWaterIntake(amount);
    setShowWaterModal(false);
  };

  const handleSelectRecipe = async (recipe: Recipe) => {
    const now = new Date();
    await addMeal({
      name: recipe.name,
      type: recipe.type,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fats: recipe.fats,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      date: selectedDate,
      ingredients: recipe.ingredients,
      notes: `${recipe.description}\n\nPrep time: ${recipe.prepTime} min | Cook time: ${recipe.cookTime} min`,
    });
  };

  const handleDeleteMeal = async () => {
    if (selectedMeal) {
      setShowMealDetail(false);
      setSelectedMeal(null);
      await deleteMeal(selectedMeal.id);
    }
  };

  const handleEditGoal = (goalType: string, currentValue: number) => {
    setEditingGoal(goalType);
    setEditValue(currentValue.toString());
  };

  const handleSaveGoal = async () => {
    if (!editingGoal || !editValue) return;

    const value = parseInt(editValue);
    if (isNaN(value) || value <= 0) {
      Alert.alert('Invalid Value', 'Please enter a valid positive number');
      return;
    }

    const updates: any = {};
    updates[editingGoal] = value;

    await updateGoals(updates);
    setEditingGoal(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingGoal(null);
    setEditValue('');
  };

  const getMealsByType = (type: Meal['type']) => {
    return dailyNutrition.meals.filter(meal => meal.type === type);
  };

  const renderCalorieRing = () => {
    const strokeWidth = 12;
    const radius = (CIRCLE_SIZE - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progressOffset = circumference - (circumference * caloriesProgress) / 100;

    return (
      <View style={styles.calorieRing}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={radius}
            stroke={colors.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
          />
        </Svg>
        <View style={styles.calorieCenter}>
          <Text style={styles.calorieValue}>{dailyNutrition.calories}</Text>
          <Text style={styles.calorieGoal}>/ {goals.calories}</Text>
          <Text style={styles.calorieLabel}>calories</Text>
        </View>
      </View>
    );
  };

  const renderMacroBar = (label: string, current: number, goal: number, color: string, progress: number) => {
    return (
      <View style={styles.macroBar}>
        <View style={styles.macroHeader}>
          <Text style={styles.macroLabel}>{label}</Text>
          <Text style={styles.macroValue}>
            {current}g / {goal}g
          </Text>
        </View>
        <View style={styles.macroProgressBg}>
          <LinearGradient
            colors={[color, color + 'AA']}
            style={[styles.macroProgressFill, { width: `${progress}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
      </View>
    );
  };

  const renderWaterTracker = () => {
    const todayWaterIntakes = waterIntakes.filter(intake => intake.date === selectedDate);
    
    return (
      <View style={styles.waterTracker}>
        <View style={styles.waterHeader}>
          <View style={styles.waterTitleRow}>
            <MaterialIcons name="local-drink" size={24} color={colors.teal} />
            <Text style={styles.waterTitle}>Water Intake</Text>
          </View>
          <View style={styles.waterStats}>
            <Text style={styles.waterStatsText}>
              {waterGlasses}/{totalGlasses} glasses
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addWaterButton}
            onPress={() => setShowWaterModal(true)}
          >
            <MaterialIcons name="add" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.waterGlasses}>
          {[...Array(totalGlasses)].map((_, index) => (
            <View
              key={index}
              style={styles.waterGlass}
            >
              <MaterialIcons
                name="local-drink"
                size={32}
                color={index < waterGlasses ? colors.teal : colors.border}
              />
            </View>
          ))}
        </View>

        {todayWaterIntakes.length > 0 && (
          <View style={styles.waterIntakesList}>
            <Text style={styles.waterIntakesTitle}>Today's Water Intake</Text>
            {todayWaterIntakes.map(intake => (
              <View key={intake.id} style={styles.waterIntakeItem}>
                <View style={styles.waterIntakeInfo}>
                  <MaterialIcons name="local-drink" size={20} color={colors.teal} />
                  <Text style={styles.waterIntakeAmount}>{intake.amount}ml</Text>
                  <Text style={styles.waterIntakeTime}>{intake.time}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteWaterButton}
                  onPress={() => {
                    Alert.alert(
                      'Remove Water Intake',
                      `Remove ${intake.amount}ml water entry?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => deleteWaterIntake(intake.id),
                        },
                      ]
                    );
                  }}
                >
                  <MaterialIcons name="close" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.waterProgress}>
          <Text style={styles.waterProgressText}>
            {(dailyNutrition.water / 1000).toFixed(1)}L / {(goals.water / 1000).toFixed(1)}L
          </Text>
          <Text style={styles.waterProgressPercentage}>
            {Math.round(waterProgress)}%
          </Text>
        </View>
      </View>
    );
  };

  const renderSuggestedRecipes = () => {
    // Get suggested recipes based on remaining calories and current time
    const remainingCalories = goals.calories - dailyNutrition.calories;
    const currentHour = new Date().getHours();
    
    // Determine meal type based on time
    let suggestedType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'dinner';
    if (currentHour < 11) suggestedType = 'breakfast';
    else if (currentHour < 15) suggestedType = 'lunch';
    else if (currentHour < 18) suggestedType = 'snack';

    // Get recipes from database
    const { RECIPE_DATABASE, filterRecipesByType, filterRecipesByCalories } = require('../data/recipes');
    let suggestions = filterRecipesByType(RECIPE_DATABASE, suggestedType);
    
    // Filter by remaining calories if significant calories left
    if (remainingCalories > 200) {
      suggestions = filterRecipesByCalories(suggestions, remainingCalories / 2, remainingCalories);
    }
    
    // Take top 3 suggestions
    suggestions = suggestions.slice(0, 3);

    if (suggestions.length === 0) return null;

    return (
      <View style={styles.suggestedRecipesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suggested for You</Text>
          <TouchableOpacity onPress={() => setShowRecipeBrowser(true)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.suggestionSubtext}>
          Based on your remaining {Math.round(remainingCalories)} calories
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestedScroll}>
          {suggestions.map((recipe: any) => (
            <TouchableOpacity
              key={recipe.id}
              style={styles.suggestedCard}
              onPress={() => handleSelectRecipe(recipe)}
            >
              <View style={styles.recipeCardWrapper}>
                <View style={styles.recipeImageHeader}>
                  <MaterialIcons name="restaurant-menu" size={40} color={colors.primary} />
                  <View style={[styles.recipeDifficultyTag, { 
                    backgroundColor: recipe.difficulty === 'easy' ? colors.success : 
                                    recipe.difficulty === 'medium' ? colors.accent : 
                                    colors.error,
                  }]}>
                    <Text style={styles.recipeDifficultyText}>{recipe.difficulty}</Text>
                  </View>
                </View>

                <View style={styles.recipeCardBody}>
                  <Text style={styles.recipeTitle} numberOfLines={2}>
                    {recipe.name}
                  </Text>

                  <View style={styles.recipeStatsGrid}>
                    <View style={styles.recipeStatItem}>
                      <MaterialIcons name="local-fire-department" size={20} color={colors.accent} />
                      <Text style={styles.recipeStatText}>{recipe.calories} cal</Text>
                    </View>
                    <View style={styles.recipeStatItem}>
                      <MaterialIcons name="schedule" size={20} color={colors.textSecondary} />
                      <Text style={styles.recipeStatText}>{recipe.prepTime + recipe.cookTime} min</Text>
                    </View>
                  </View>

                  <View style={styles.recipeMacroRow}>
                    <Text style={styles.macroSmallText}>P {recipe.protein}g</Text>
                    <Text style={styles.macroSmallText}>C {recipe.carbs}g</Text>
                    <Text style={styles.macroSmallText}>F {recipe.fats}g</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.recipeAddButton}
                  onPress={() => handleSelectRecipe(recipe)}
                >
                  <MaterialIcons name="add" size={24} color={colors.textLight} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderMealSection = () => {
    return (
      <View style={styles.mealsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Meals</Text>
          <View style={styles.mealActionsRow}>
            <TouchableOpacity
              style={styles.recipeBrowserButton}
              onPress={() => setShowRecipeBrowser(true)}
            >
              <MaterialIcons name="restaurant-menu" size={20} color={colors.teal} />
              <Text style={styles.recipeBrowserButtonText}>Browse</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addMealButton}
              onPress={() => setShowAddMeal(true)}
            >
              <MaterialIcons name="add-circle" size={20} color={colors.textLight} />
              <Text style={styles.addMealButtonText}>Custom</Text>
            </TouchableOpacity>
          </View>
        </View>

        {mealTypes.map(({ type, label, icon, color }) => {
          const typeMeals = getMealsByType(type);
          if (typeMeals.length === 0) return null;

          return (
            <View key={type} style={styles.mealTypeSection}>
              <View style={styles.mealTypeHeader}>
                <View style={[styles.mealTypeIcon, { backgroundColor: color + '20' }]}>
                  <MaterialIcons name={icon as any} size={20} color={color} />
                </View>
                <Text style={styles.mealTypeLabel}>{label}</Text>
              </View>

              {typeMeals.map(meal => {
                const mealTypeData = mealTypes.find(t => t.type === meal.type);
                return (
                  <TouchableOpacity
                    key={meal.id}
                    style={styles.mealCard}
                    onPress={() => {
                      setSelectedMeal(meal);
                      setShowMealDetail(true);
                    }}
                  >
                    <View style={styles.mealCardInner}>
                      <View style={styles.mealCardHeader}>
                        <View style={[styles.mealIconBadge, { backgroundColor: mealTypeData?.color }]}>
                          <MaterialIcons name={mealTypeData?.icon as any} size={28} color="#FFFFFF" />
                        </View>
                        <View style={styles.mealInfo}>
                          <Text style={styles.mealName}>{meal.name}</Text>
                          <View style={styles.mealTimeRow}>
                            <MaterialIcons name="schedule" size={14} color={colors.textSecondary} />
                            <Text style={styles.mealTime}>{meal.time}</Text>
                          </View>
                        </View>
                        <View style={styles.caloriesBadge}>
                          <Text style={styles.mealCalories}>{meal.calories}</Text>
                          <Text style={styles.caloriesLabel}>cal</Text>
                        </View>
                      </View>

                      <View style={styles.mealMacrosRow}>
                        <View style={styles.mealMacroItem}>
                          <MaterialIcons name="fitness-center" size={16} color={colors.primary} />
                          <Text style={styles.macroItemValue}>{meal.protein}g</Text>
                          <Text style={styles.macroItemLabel}>Protein</Text>
                        </View>
                        <View style={styles.mealMacroDivider} />
                        <View style={styles.mealMacroItem}>
                          <MaterialIcons name="grain" size={16} color={colors.secondary} />
                          <Text style={styles.macroItemValue}>{meal.carbs}g</Text>
                          <Text style={styles.macroItemLabel}>Carbs</Text>
                        </View>
                        <View style={styles.mealMacroDivider} />
                        <View style={styles.mealMacroItem}>
                          <MaterialIcons name="water-drop" size={16} color={colors.purple} />
                          <Text style={styles.macroItemValue}>{meal.fats}g</Text>
                          <Text style={styles.macroItemLabel}>Fats</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {dailyNutrition.meals.length === 0 && (
          <View style={styles.emptyMeals}>
            <MaterialIcons name="restaurant-menu" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyMealsText}>No meals logged today</Text>
            <Text style={styles.emptyMealsSubtext}>Tap + to add your first meal</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Nutrition</Text>
          <Text style={styles.headerTitle}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.calculatorButton}
            onPress={() => onNavigate?.('nutrition-calculator')}
          >
            <MaterialIcons name="calculate" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}
          >
            <MaterialIcons name="settings" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={styles.calorieSection}>
            {renderCalorieRing()}
            
            <View style={styles.macrosContainer}>
              {renderMacroBar('Protein', dailyNutrition.protein, goals.protein, colors.primary, proteinProgress)}
              {renderMacroBar('Carbs', dailyNutrition.carbs, goals.carbs, colors.secondary, carbsProgress)}
              {renderMacroBar('Fats', dailyNutrition.fats, goals.fats, colors.accent, fatsProgress)}
            </View>
          </View>

          <View style={styles.waterSection}>
            {renderWaterTracker()}
          </View>

          {renderSuggestedRecipes()}

          {renderMealSection()}

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showAddMeal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAddMeal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContent,
              { transform: [{ translateY: modalSlideAnim }] }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Meal</Text>
              <TouchableOpacity onPress={() => setShowAddMeal(false)}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Meal Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={mealName}
                  onChangeText={setMealName}
                  placeholder="e.g. Grilled Chicken Salad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Meal Type</Text>
                <View style={styles.mealTypeGrid}>
                  {mealTypes.map(({ type, label, icon, color }) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.mealTypeOption,
                        mealType === type && styles.mealTypeOptionSelected,
                        mealType === type && { borderColor: color },
                      ]}
                      onPress={() => setMealType(type)}
                    >
                      <MaterialIcons
                        name={icon as any}
                        size={24}
                        color={mealType === type ? color : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.mealTypeOptionLabel,
                          mealType === type && { color },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Calories</Text>
                <TextInput
                  style={styles.formInput}
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.formLabel}>Protein (g)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={protein}
                    onChangeText={setProtein}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Carbs (g)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={carbs}
                    onChangeText={setCarbs}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Fats (g)</Text>
                <TextInput
                  style={styles.formInput}
                  value={fats}
                  onChangeText={setFats}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleAddMeal}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.submitButtonText}>Add Meal</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showWaterModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowWaterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.waterModalContent}>
            <Text style={styles.waterModalTitle}>Add Water</Text>
            <Text style={styles.waterModalSubtitle}>Select amount</Text>

            <View style={styles.waterAmountGrid}>
              {quickWaterAmounts.map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={styles.waterAmountOption}
                  onPress={() => handleAddWater(amount)}
                >
                  <MaterialIcons name="local-drink" size={40} color={colors.teal} />
                  <Text style={styles.waterAmountText}>{amount}ml</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.waterModalClose}
              onPress={() => setShowWaterModal(false)}
            >
              <Text style={styles.waterModalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMealDetail}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowMealDetail(false)}
      >
        <View style={styles.modalOverlay}>
          {selectedMeal && (
            <View style={styles.detailModal}>
              <View style={styles.detailHeader}>
                <View style={[styles.detailIconBadge, { 
                  backgroundColor: mealTypes.find(t => t.type === selectedMeal.type)?.color 
                }]}>
                  <MaterialIcons
                    name={mealTypes.find(t => t.type === selectedMeal.type)?.icon as any}
                    size={28}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.detailHeaderInfo}>
                  <Text style={styles.detailTitle}>{selectedMeal.name}</Text>
                  <View style={styles.detailTimeBadge}>
                    <MaterialIcons name="schedule" size={12} color={colors.textSecondary} />
                    <Text style={styles.detailTime}>{selectedMeal.time}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowMealDetail(false)}
                >
                  <MaterialIcons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.detailContent}>
                <View style={styles.detailCalorieCard}>
                  <MaterialIcons name="local-fire-department" size={28} color={colors.accent} />
                  <View>
                    <Text style={styles.detailCalorieValue}>{selectedMeal.calories}</Text>
                    <Text style={styles.detailCalorieLabel}>calories</Text>
                  </View>
                </View>

                <View style={styles.detailMacrosGrid}>
                  <View style={styles.detailMacroCard}>
                    <View style={[styles.detailMacroIcon, { backgroundColor: colors.primary + '20' }]}>
                      <MaterialIcons name="fitness-center" size={18} color={colors.primary} />
                    </View>
                    <Text style={styles.detailMacroValue}>{selectedMeal.protein}g</Text>
                    <Text style={styles.detailMacroLabel}>Protein</Text>
                  </View>
                  <View style={styles.detailMacroCard}>
                    <View style={[styles.detailMacroIcon, { backgroundColor: colors.secondary + '20' }]}>
                      <MaterialIcons name="grain" size={18} color={colors.secondary} />
                    </View>
                    <Text style={styles.detailMacroValue}>{selectedMeal.carbs}g</Text>
                    <Text style={styles.detailMacroLabel}>Carbs</Text>
                  </View>
                  <View style={styles.detailMacroCard}>
                    <View style={[styles.detailMacroIcon, { backgroundColor: colors.purple + '20' }]}>
                      <MaterialIcons name="water-drop" size={18} color={colors.purple} />
                    </View>
                    <Text style={styles.detailMacroValue}>{selectedMeal.fats}g</Text>
                    <Text style={styles.detailMacroLabel}>Fats</Text>
                  </View>
                </View>

                {selectedMeal.ingredients && selectedMeal.ingredients.length > 0 && (
                  <View style={styles.detailIngredientsSection}>
                    <Text style={styles.detailSectionTitle}>Ingredients</Text>
                    <View style={styles.ingredientsList}>
                      {selectedMeal.ingredients.slice(0, 5).map((ingredient, index) => (
                        <View key={index} style={styles.ingredientItem}>
                          <View style={styles.ingredientBullet} />
                          <Text style={styles.ingredientText} numberOfLines={1}>{ingredient}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={styles.deleteButtonCompact}
                  onPress={handleDeleteMeal}
                >
                  <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButtonCompact}
                  onPress={() => setShowMealDetail(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <RecipeBrowser
        visible={showRecipeBrowser}
        onClose={() => setShowRecipeBrowser(false)}
        onSelectRecipe={handleSelectRecipe}
      />

      <BottomNavigation
        activeTab="nutrition"
        onTabChange={(tab) => onNavigate?.(tab)}
      />

      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsModal}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Nutrition Settings</Text>
              <TouchableOpacity 
                onPress={() => setShowSettings(false)}
                style={styles.settingsCloseButton}
              >
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.settingsList}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Daily Goals</Text>
                
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <MaterialIcons name="local-fire-department" size={24} color={colors.accent} />
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingLabel}>Calorie Goal</Text>
                      <View style={styles.settingValueRow}>
                        {editingGoal === 'calories' ? (
                          <TextInput
                            style={styles.settingInput}
                            value={editValue}
                            onChangeText={setEditValue}
                            keyboardType="numeric"
                            placeholder="Enter calories"
                            autoFocus
                          />
                        ) : (
                          <Text style={styles.settingValue}>{goals.calories} kcal</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  {editingGoal === 'calories' ? (
                    <View style={styles.editActions}>
                      <TouchableOpacity onPress={handleSaveGoal} style={styles.saveButton}>
                        <MaterialIcons name="check" size={20} color={colors.success} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                        <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEditGoal('calories', goals.calories)}
                    >
                      <MaterialIcons name="edit" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <MaterialIcons name="fitness-center" size={24} color={colors.primary} />
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingLabel}>Protein Goal</Text>
                      <View style={styles.settingValueRow}>
                        {editingGoal === 'protein' ? (
                          <TextInput
                            style={styles.settingInput}
                            value={editValue}
                            onChangeText={setEditValue}
                            keyboardType="numeric"
                            placeholder="Enter protein (g)"
                            autoFocus
                          />
                        ) : (
                          <Text style={styles.settingValue}>{goals.protein}g</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  {editingGoal === 'protein' ? (
                    <View style={styles.editActions}>
                      <TouchableOpacity onPress={handleSaveGoal} style={styles.saveButton}>
                        <MaterialIcons name="check" size={20} color={colors.success} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                        <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEditGoal('protein', goals.protein)}
                    >
                      <MaterialIcons name="edit" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <MaterialIcons name="grain" size={24} color={colors.secondary} />
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingLabel}>Carbs Goal</Text>
                      <View style={styles.settingValueRow}>
                        {editingGoal === 'carbs' ? (
                          <TextInput
                            style={styles.settingInput}
                            value={editValue}
                            onChangeText={setEditValue}
                            keyboardType="numeric"
                            placeholder="Enter carbs (g)"
                            autoFocus
                          />
                        ) : (
                          <Text style={styles.settingValue}>{goals.carbs}g</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  {editingGoal === 'carbs' ? (
                    <View style={styles.editActions}>
                      <TouchableOpacity onPress={handleSaveGoal} style={styles.saveButton}>
                        <MaterialIcons name="check" size={20} color={colors.success} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                        <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEditGoal('carbs', goals.carbs)}
                    >
                      <MaterialIcons name="edit" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <MaterialIcons name="water-drop" size={24} color={colors.purple} />
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingLabel}>Fats Goal</Text>
                      <View style={styles.settingValueRow}>
                        {editingGoal === 'fats' ? (
                          <TextInput
                            style={styles.settingInput}
                            value={editValue}
                            onChangeText={setEditValue}
                            keyboardType="numeric"
                            placeholder="Enter fats (g)"
                            autoFocus
                          />
                        ) : (
                          <Text style={styles.settingValue}>{goals.fats}g</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  {editingGoal === 'fats' ? (
                    <View style={styles.editActions}>
                      <TouchableOpacity onPress={handleSaveGoal} style={styles.saveButton}>
                        <MaterialIcons name="check" size={20} color={colors.success} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                        <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEditGoal('fats', goals.fats)}
                    >
                      <MaterialIcons name="edit" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <MaterialIcons name="local-drink" size={24} color={colors.teal} />
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingLabel}>Water Goal</Text>
                      <View style={styles.settingValueRow}>
                        {editingGoal === 'water' ? (
                          <TextInput
                            style={styles.settingInput}
                            value={editValue}
                            onChangeText={setEditValue}
                            keyboardType="numeric"
                            placeholder="Enter water (ml)"
                            autoFocus
                          />
                        ) : (
                          <Text style={styles.settingValue}>{goals.water}ml</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  {editingGoal === 'water' ? (
                    <View style={styles.editActions}>
                      <TouchableOpacity onPress={handleSaveGoal} style={styles.saveButton}>
                        <MaterialIcons name="check" size={20} color={colors.success} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                        <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEditGoal('water', goals.water)}
                    >
                      <MaterialIcons name="edit" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Preferences</Text>
                
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <MaterialIcons name="notifications" size={24} color={mealRemindersEnabled ? colors.primary : colors.textSecondary} />
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingLabel}>Meal Reminders</Text>
                      <Text style={styles.settingDescription}>Get notified for meal times</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={toggleMealReminders}
                    style={[
                      styles.toggleSwitch,
                      mealRemindersEnabled && styles.toggleSwitchActive
                    ]}
                  >
                    <View style={[
                      styles.toggleKnob,
                      mealRemindersEnabled && styles.toggleKnobActive
                    ]} />
                  </TouchableOpacity>
                </View>
              </View>
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
  headerSubtitle: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  calculatorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  calorieSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  calorieRing: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  calorieCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calorieValue: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    lineHeight: 32,
  },
  calorieGoal: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  calorieLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginTop: 2,
  },
  macrosContainer: {
    gap: spacing.md,
  },
  macroBar: {
    gap: spacing.xs,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  macroValue: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  macroProgressBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  macroProgressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  waterSection: {
    marginBottom: spacing.lg,
  },
  waterTracker: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  waterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  waterTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  waterStats: {
    flex: 1,
    alignItems: 'center',
  },
  waterStatsText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  waterSubtitle: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  addWaterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterGlasses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  waterGlass: {
    width: (width - spacing.lg * 2 - spacing.md * 5) / 4,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  waterProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterProgressText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  waterProgressPercentage: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.teal,
  },
  waterIntakesList: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  waterIntakesTitle: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  waterIntakeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  waterIntakeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  waterIntakeAmount: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.teal,
  },
  waterIntakeTime: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  deleteWaterButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealsSection: {
    marginBottom: spacing.lg,
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
  mealActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  recipeBrowserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.teal,
  },
  recipeBrowserButtonText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.teal,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  addMealButtonText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textLight,
  },
  mealTypeSection: {
    marginBottom: spacing.md,
  },
  mealTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  mealTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealTypeLabel: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  mealCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
  },
  mealCardInner: {
    padding: spacing.md,
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  mealIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  mealTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealTime: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  caloriesBadge: {
    alignItems: 'center',
  },
  mealCalories: {
    fontSize: fontSizes.xxl,
    fontFamily: 'Poppins_700Bold',
    color: colors.accent,
    lineHeight: 32,
  },
  caloriesLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  mealMacrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mealMacroItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  mealMacroDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  macroItemValue: {
    fontSize: fontSizes.sm,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  macroItemLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    width: '100%',
    textAlign: 'center',
  },
  emptyMeals: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyMealsText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyMealsSubtext: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  modalForm: {
    padding: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.sm,
  },
  formLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formRow: {
    flexDirection: 'row',
  },
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mealTypeOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  mealTypeOptionSelected: {
    borderWidth: 2,
  },
  mealTypeOptionLabel: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  submitButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    padding: spacing.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textLight,
  },
  waterModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    maxWidth: 400,
    width: '100%',
  },
  waterModalTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  waterModalSubtitle: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  waterAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  waterAmountOption: {
    width: Math.min(140, (width - spacing.xl * 4 - spacing.md) / 2),
    aspectRatio: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.teal,
  },
  waterAmountText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.teal,
    marginTop: spacing.sm,
  },
  waterModalClose: {
    padding: spacing.md,
    alignItems: 'center',
  },
  waterModalCloseText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  detailModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xxl,
    maxWidth: 420,
    alignSelf: 'center',
    width: '95%',
    overflow: 'hidden',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  detailIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailTitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 2,
  },
  detailTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailTime: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  detailContent: {
    paddingVertical: spacing.md,
  },
  detailCalorieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent + '10',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  detailCalorieValue: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: colors.accent,
    lineHeight: 32,
  },
  detailCalorieLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  detailSectionTitle: {
    fontSize: fontSizes.sm,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  detailMacrosGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  detailMacroCard: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xs,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  detailMacroIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailMacroValue: {
    fontSize: fontSizes.sm,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  detailMacroLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  detailIngredientsSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  ingredientsList: {
    backgroundColor: colors.background,
    padding: spacing.xs,
    borderRadius: borderRadius.md,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingVertical: 2,
  },
  ingredientBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginRight: spacing.xs,
    marginTop: 5,
  },
  ingredientText: {
    flex: 1,
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  moreIngredientsText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  detailActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  deleteButtonCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  deleteButtonText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.error,
  },
  closeButtonCompact: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeButtonText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  settingsModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    height: '75%',
    ...shadows.lg,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  settingsCloseButton: {
    padding: spacing.xs,
  },
  settingsList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  settingsSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  settingsSectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  settingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  settingLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  settingValue: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    marginTop: 2,
  },
  settingDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    marginTop: 2,
  },
  editButton: {
    padding: spacing.sm,
  },
  settingInput: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontFamily: 'Quicksand_600SemiBold',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 100,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignSelf: 'center',
  },
  saveButton: {
    padding: spacing.sm,
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.sm,
  },
  cancelButton: {
    padding: spacing.sm,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: colors.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  toggleKnobActive: {
    transform: [{ translateX: 22 }],
  },
  suggestedRecipesSection: {
    marginBottom: spacing.lg,
  },
  viewAllText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
  },
  suggestionSubtext: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  suggestedScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  suggestedCard: {
    width: width * 0.7,
    marginRight: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
  },
  recipeCardWrapper: {
    position: 'relative',
  },
  recipeImageHeader: {
    backgroundColor: colors.primaryPale,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    position: 'relative',
  },
  recipeDifficultyTag: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  recipeDifficultyText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textLight,
    textTransform: 'uppercase',
  },
  recipeCardBody: {
    padding: spacing.md,
  },
  recipeTitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  recipeStatsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  recipeStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeStatText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  recipeMacroRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  macroSmallText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  recipeAddButton: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
  },
  addRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  addRecipeButtonText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textLight,
  },
  suggestedCardStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  suggestedCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  suggestedCardStatText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textLight,
  },
  suggestedCardFooter: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  suggestedCardMacros: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textLight,
    opacity: 0.9,
  },
});
