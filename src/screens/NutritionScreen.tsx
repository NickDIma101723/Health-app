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
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
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
        useNativeDriver: true,
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
            rotation="-90"
            origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
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
              <View style={styles.suggestedCardContent}>
                <View style={styles.suggestedImagePlaceholder}>
                  <MaterialIcons name="restaurant" size={48} color={colors.primary} />
                </View>
                
                <View style={styles.suggestedCardBody}>
                  <View style={styles.suggestedCardTop}>
                    <Text style={styles.suggestedCardTitle} numberOfLines={2}>
                      {recipe.name}
                    </Text>
                    <View style={[styles.difficultyBadgeSmall, { 
                      backgroundColor: recipe.difficulty === 'easy' ? colors.success + '20' : 
                                      recipe.difficulty === 'medium' ? colors.accent + '20' : 
                                      colors.error + '20',
                      borderWidth: 1,
                      borderColor: recipe.difficulty === 'easy' ? colors.success : 
                                   recipe.difficulty === 'medium' ? colors.accent : 
                                   colors.error,
                    }]}>
                      <Text style={[styles.difficultyBadgeText, {
                        color: recipe.difficulty === 'easy' ? colors.success : 
                               recipe.difficulty === 'medium' ? colors.accent : 
                               colors.error,
                      }]}>{recipe.difficulty}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.suggestedCardDescription} numberOfLines={3}>
                    {recipe.description}
                  </Text>

                  <View style={styles.suggestedCardStatsRow}>
                    <View style={styles.suggestedCardStatBox}>
                      <MaterialIcons name="local-fire-department" size={20} color={colors.accent} />
                      <Text style={styles.suggestedCardStatValue}>{recipe.calories}</Text>
                      <Text style={styles.suggestedCardStatLabel}>cal</Text>
                    </View>
                    <View style={styles.suggestedCardStatBox}>
                      <MaterialIcons name="timer" size={20} color={colors.primary} />
                      <Text style={styles.suggestedCardStatValue}>{recipe.prepTime + recipe.cookTime}</Text>
                      <Text style={styles.suggestedCardStatLabel}>min</Text>
                    </View>
                    <View style={styles.suggestedCardStatBox}>
                      <MaterialIcons name="emoji-food-beverage" size={20} color={colors.teal} />
                      <Text style={styles.suggestedCardStatValue}>{recipe.servings}</Text>
                      <Text style={styles.suggestedCardStatLabel}>serv</Text>
                    </View>
                  </View>

                  <View style={styles.suggestedCardMacrosRow}>
                    <View style={styles.macroChip}>
                      <Text style={styles.macroChipLabel}>Protein</Text>
                      <Text style={styles.macroChipValue}>{recipe.protein}g</Text>
                    </View>
                    <View style={styles.macroChip}>
                      <Text style={styles.macroChipLabel}>Carbs</Text>
                      <Text style={styles.macroChipValue}>{recipe.carbs}g</Text>
                    </View>
                    <View style={styles.macroChip}>
                      <Text style={styles.macroChipLabel}>Fats</Text>
                      <Text style={styles.macroChipValue}>{recipe.fats}g</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.addRecipeButton}
                    onPress={() => handleSelectRecipe(recipe)}
                  >
                    <MaterialIcons name="add-circle" size={20} color={colors.textLight} />
                    <Text style={styles.addRecipeButtonText}>Add to Meals</Text>
                  </TouchableOpacity>
                </View>
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

              {typeMeals.map(meal => (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.mealCard}
                  onPress={() => {
                    setSelectedMeal(meal);
                    setShowMealDetail(true);
                  }}
                >
                  <View style={styles.mealCardLeft}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={styles.mealTime}>{meal.time}</Text>
                  </View>
                  <View style={styles.mealCardRight}>
                    <Text style={styles.mealCalories}>{meal.calories}</Text>
                    <Text style={styles.mealCaloriesLabel}>cal</Text>
                  </View>
                </TouchableOpacity>
              ))}
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
          <Text style={styles.headerTitle}>October 10, 2025</Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <MaterialIcons name="settings" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
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

            <ScrollView style={styles.modalScroll}>
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
            </ScrollView>
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
                <View style={styles.detailIconContainer}>
                  <MaterialIcons
                    name={mealTypes.find(t => t.type === selectedMeal.type)?.icon as any}
                    size={48}
                    color={mealTypes.find(t => t.type === selectedMeal.type)?.color}
                  />
                </View>
                <Text style={styles.detailTitle}>{selectedMeal.name}</Text>
                <Text style={styles.detailTime}>{selectedMeal.time}</Text>
              </View>

              <View style={styles.detailNutrition}>
                <View style={styles.detailNutritionItem}>
                  <Text style={styles.detailNutritionValue}>{selectedMeal.calories}</Text>
                  <Text style={styles.detailNutritionLabel}>Calories</Text>
                </View>
                <View style={styles.detailNutritionItem}>
                  <Text style={styles.detailNutritionValue}>{selectedMeal.protein}g</Text>
                  <Text style={styles.detailNutritionLabel}>Protein</Text>
                </View>
                <View style={styles.detailNutritionItem}>
                  <Text style={styles.detailNutritionValue}>{selectedMeal.carbs}g</Text>
                  <Text style={styles.detailNutritionLabel}>Carbs</Text>
                </View>
                <View style={styles.detailNutritionItem}>
                  <Text style={styles.detailNutritionValue}>{selectedMeal.fats}g</Text>
                  <Text style={styles.detailNutritionLabel}>Fats</Text>
                </View>
              </View>

              {selectedMeal.ingredients && selectedMeal.ingredients.length > 0 && (
                <View style={styles.detailIngredients}>
                  <Text style={styles.detailIngredientsTitle}>Ingredients</Text>
                  {selectedMeal.ingredients.map((ingredient, index) => (
                    <View key={index} style={styles.ingredientItem}>
                      <View style={styles.ingredientDot} />
                      <Text style={styles.ingredientText}>{ingredient}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={[styles.detailActionButton, styles.deleteButton]}
                  onPress={handleDeleteMeal}
                >
                  <MaterialIcons name="delete" size={24} color={colors.error} />
                  <Text style={[styles.detailActionText, { color: colors.error }]}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailActionButton}
                  onPress={() => setShowMealDetail(false)}
                >
                  <MaterialIcons name="close" size={24} color={colors.textPrimary} />
                  <Text style={styles.detailActionText}>Close</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  mealCardLeft: {
    flex: 1,
  },
  mealCardRight: {
    alignItems: 'flex-end',
  },
  mealName: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  mealTime: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  mealCalories: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  mealCaloriesLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
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
  modalScroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  formInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSizes.md,
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
    padding: spacing.md,
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
    borderRadius: borderRadius.xxl,
    margin: spacing.lg,
    marginTop: 'auto',
    marginBottom: 'auto',
    maxWidth: 400,
    alignSelf: 'center',
    width: '90%',
  },
  detailHeader: {
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  detailTime: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  detailNutrition: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailNutritionItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailNutritionValue: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  detailNutritionLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  detailIngredients: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailIngredientsTitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  ingredientDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  ingredientText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  detailActions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  deleteButton: {
    backgroundColor: colors.error + '10',
  },
  detailActionText: {
    fontSize: fontSizes.sm,
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
    width: width * 0.85,
    marginRight: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  suggestedCardContent: {
    flex: 1,
  },
  suggestedImagePlaceholder: {
    height: 120,
    backgroundColor: colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  suggestedCardBody: {
    padding: spacing.md,
  },
  suggestedCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  difficultyBadgeSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  difficultyBadgeText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    textTransform: 'capitalize',
  },
  suggestedCardTitle: {
    flex: 1,
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  suggestedCardDescription: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  suggestedCardStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  suggestedCardStatBox: {
    alignItems: 'center',
    flex: 1,
  },
  suggestedCardStatValue: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: 2,
  },
  suggestedCardStatLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginTop: 2,
  },
  suggestedCardMacrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  macroChip: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  macroChipLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  macroChipValue: {
    fontSize: fontSizes.sm,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
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
