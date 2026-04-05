import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  StatusBar,
  SafeAreaView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import {
  Fire,
  Barbell,
  Lightning,
  Drop,
  Sun,
  ForkKnife,
  CookingPot,
  Cookie,
  Plus,
  X,
  GearSix,
  Calculator,
  Trash,
  Clock,
  Check,
  PencilSimple,
  Bell,
  Sparkle,
  ArrowLeft,
  Barcode,
} from 'phosphor-react-native';
import { RecipeBrowser } from '../components/RecipeBrowser';
import { useNutritionAdapter } from '../hooks/useNutritionAdapter';
import { useRecipeSearch } from '../hooks/useRecipeSearch';
import { Meal } from '../contexts/NutritionContext';
import { useAuth } from '../contexts/AuthContext';
import { Recipe } from '../data/recipes';

const { width } = Dimensions.get('window');
const RING = 150;

const F = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
} as const;

const S = {
  bg: '#FAFAFA',
  card: '#FFFFFF',
  dark: '#111111',
  lime: '#D4F940',
  text: '#1A1A1A',
  dim: '#8C8C8C',
  border: '#EEEEEE',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  warmBg: '#F5F0EB',
  teal: '#14B8A6',
} as const;

interface NutritionScreenProps {
  onNavigate?: (screen: string) => void;
}

const MEAL_TYPES = [
  { type: 'breakfast' as const, label: 'Breakfast', Icon: Sun, color: S.amber },
  { type: 'lunch' as const, label: 'Lunch', Icon: ForkKnife, color: S.green },
  { type: 'dinner' as const, label: 'Dinner', Icon: CookingPot, color: S.blue },
  { type: 'snack' as const, label: 'Snack', Icon: Cookie, color: S.purple },
];

const WATER_AMOUNTS = [250, 350, 500, 750];

const DETAIL_BG: Record<string, string> = {
  breakfast: '#FFF3E0',
  lunch: '#E8F5E9',
  dinner: '#F3E5F5',
  snack: '#F3E5F5',
};

const CARD_THEMES = [
  { bg: '#F0F7E6', accent: '#4CAF50' },
  { bg: '#FEF4E8', accent: '#F59E0B' },
  { bg: '#FFF0F0', accent: '#EF4444' },
  { bg: '#EEF1FD', accent: '#3B82F6' },
  { bg: '#FDF4FF', accent: '#8B5CF6' },
];

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

  const { recipes: apiRecipes, loading: recipesLoading, fetchRandom } = useRecipeSearch();

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
    const loadPref = async () => {
      if (!user) return;
      try {
        const val = await AsyncStorage.getItem(`meal_reminders_${user.id}`);
        if (val !== null) setMealRemindersEnabled(val === 'true');
      } catch (e) {
        console.error('Failed to load meal reminders preference:', e);
      }
    };
    loadPref();
  }, [user]);

  const toggleMealReminders = async () => {
    const next = !mealRemindersEnabled;
    setMealRemindersEnabled(next);
    if (user) {
      try {
        await AsyncStorage.setItem(`meal_reminders_${user.id}`, next.toString());
      } catch (e) {
        console.error('Failed to save meal reminders preference:', e);
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
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
  }, []);

  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [meals.length, waterIntakes.length]);

  /* ── Handlers ── */

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
      imageUrl: recipe.imageUrl,
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

  const getMealsByType = (type: Meal['type']) =>
    dailyNutrition.meals.filter(meal => meal.type === type);

  const getMealTypeConfig = (type: string) => MEAL_TYPES.find(t => t.type === type);

  /* ── Render: Calorie Hero ── */

  const remaining = Math.max(goals.calories - dailyNutrition.calories, 0);

  const renderCalorieHero = () => {
    const sw = 14;
    const r = (RING - sw) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (circ * caloriesProgress) / 100;

    return (
      <View style={st.heroCard}>
        {/* Top row: ring + stats */}
        <View style={st.heroRow}>
          <View style={st.ringWrap}>
            <Svg width={RING} height={RING}>
              <Circle cx={RING / 2} cy={RING / 2} r={r} stroke="rgba(0,0,0,0.06)" strokeWidth={sw} fill="none" />
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={r}
                stroke={S.green}
                strokeWidth={sw}
                fill="none"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
              />
            </Svg>
            <View style={st.ringCenter}>
              <Text style={st.ringVal}>{dailyNutrition.calories}</Text>
              <Text style={st.ringUnit}>kcal</Text>
            </View>
          </View>

          <View style={st.heroRight}>
            <Text style={st.heroGoalLabel}>Daily Goal</Text>
            <Text style={st.heroGoalVal}>{goals.calories}</Text>
            <View style={st.heroRemaining}>
              <View style={st.heroRemDot} />
              <Text style={st.heroRemText}>{remaining} remaining</Text>
            </View>
          </View>
        </View>

        {/* Macro strip — single row, no boxes */}
        <View style={st.macroStrip}>
          <View style={st.macroStripItem}>
            <View style={[st.macroStripDot, { backgroundColor: S.green }]} />
            <Text style={st.macroStripVal}>{dailyNutrition.protein}g</Text>
            <Text style={st.macroStripLabel}>protein</Text>
          </View>
          <View style={st.macroStripDiv} />
          <View style={st.macroStripItem}>
            <View style={[st.macroStripDot, { backgroundColor: S.amber }]} />
            <Text style={st.macroStripVal}>{dailyNutrition.carbs}g</Text>
            <Text style={st.macroStripLabel}>carbs</Text>
          </View>
          <View style={st.macroStripDiv} />
          <View style={st.macroStripItem}>
            <View style={[st.macroStripDot, { backgroundColor: S.blue }]} />
            <Text style={st.macroStripVal}>{dailyNutrition.fats}g</Text>
            <Text style={st.macroStripLabel}>fats</Text>
          </View>
        </View>
      </View>
    );
  };

  /* ── Render: Water ── */

  const renderWater = () => {
    const todayIntakes = waterIntakes.filter(i => i.date === selectedDate);
    return (
      <View style={st.waterCard}>
        <View style={st.waterTop}>
          <View style={st.waterLeft}>
            <View style={[st.iconBadge, { backgroundColor: S.teal + '15' }]}>
              <Drop size={20} color={S.teal} weight="fill" />
            </View>
            <View>
              <Text style={st.waterTitle}>Water</Text>
              <Text style={st.waterSub}>
                {(dailyNutrition.water / 1000).toFixed(1)}L / {(goals.water / 1000).toFixed(1)}L
              </Text>
            </View>
          </View>
          <TouchableOpacity style={st.waterAddBtn} onPress={() => setShowWaterModal(true)} activeOpacity={0.7}>
            <Plus size={18} color="#FFF" weight="bold" />
          </TouchableOpacity>
        </View>

        <View style={st.waterBarTrack}>
          <View style={[st.waterBarFill, { width: `${Math.min(waterProgress, 100)}%` }]} />
        </View>
        <Text style={st.waterPct}>{Math.round(waterProgress)}% of daily goal</Text>

        {todayIntakes.length > 0 && (
          <View style={st.waterList}>
            {todayIntakes.map(intake => (
              <View key={intake.id} style={st.waterItem}>
                <Drop size={16} color={S.teal} weight="fill" />
                <Text style={st.waterItemAmt}>{intake.amount}ml</Text>
                <Text style={st.waterItemTime}>{intake.time}</Text>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Remove Water', `Remove ${intake.amount}ml entry?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => deleteWaterIntake(intake.id) },
                    ])
                  }
                  style={st.waterDel}
                >
                  <X size={14} color={S.red} weight="bold" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  /* ── Render: Suggestions ── */

  const renderSuggestions = () => {
    const remaining = goals.calories - dailyNutrition.calories;

    // Use API recipes if available, fallback to local
    let sug = apiRecipes.length > 0 ? apiRecipes.slice(0, 5) : [];
    if (sug.length === 0) {
      const hour = new Date().getHours();
      let sugType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'dinner';
      if (hour < 11) sugType = 'breakfast';
      else if (hour < 15) sugType = 'lunch';
      else if (hour < 18) sugType = 'snack';
      const { RECIPE_DATABASE, filterRecipesByType } = require('../data/recipes');
      sug = filterRecipesByType(RECIPE_DATABASE, sugType).slice(0, 3);
    }

    if (sug.length === 0 && !recipesLoading) return null;

    return (
      <View style={{ marginBottom: 24 }}>
        <View style={st.secHead}>
          <View>
            <Text style={st.secTitle}>Suggested for You</Text>
            <Text style={st.secSub}>{Math.round(remaining)} cal remaining</Text>
          </View>
          <TouchableOpacity onPress={() => setShowRecipeBrowser(true)}>
            <Text style={st.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          snapToInterval={width * 0.62 + 12}
          decelerationRate="fast"
        >
          {sug.map((recipe: any, idx: number) => {
            const accent = getMealTypeConfig(recipe.type)?.color || S.green;
            const warmBgs = ['#FEF4E8', '#EEF6EC', '#FFF0F0', '#EEF1FD', '#FDF4FF'];
            const cardBg = warmBgs[idx % warmBgs.length];
            return (
              <TouchableOpacity
                key={recipe.id}
                style={[st.sugCard, { backgroundColor: cardBg }]}
                onPress={() => handleSelectRecipe(recipe)}
                activeOpacity={0.9}
              >
                {/* Big hero image */}
                <View style={st.sugImgWrap}>
                  {recipe.imageUrl ? (
                    <Image source={{ uri: recipe.imageUrl }} style={st.sugImg} resizeMode="cover" />
                  ) : (
                    <View style={[st.sugImg, { backgroundColor: accent + '18' }]}>
                      <ForkKnife size={40} color={accent} weight="duotone" />
                    </View>
                  )}
                </View>

                {/* Floating labels on image */}
                <View style={st.sugBadgeRow}>
                  <View style={st.sugBadge}>
                    <Text style={st.sugBadgeText}>{recipe.calories} Kcal</Text>
                  </View>
                  <View style={st.sugBadge}>
                    <Clock size={10} color={S.text} weight="bold" />
                    <Text style={st.sugBadgeText}>{recipe.prepTime + recipe.cookTime} min</Text>
                  </View>
                </View>

                {/* Text area below image */}
                <View style={st.sugBody}>
                  <Text style={st.sugType}>{recipe.type}</Text>
                  <Text style={st.sugName} numberOfLines={2}>{recipe.name}</Text>
                  <Text style={st.sugDesc} numberOfLines={1}>
                    {recipe.protein}g protein · {recipe.carbs}g carbs · {recipe.fats}g fat
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  /* ── Render: Meals ── */

  const renderMeals = () => (
    <View style={{ marginBottom: 24, paddingHorizontal: 20 }}>
      <View style={st.secHead2}>
        <Text style={st.secTitle}>Today's Meals</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={st.browseBtn} onPress={() => setShowRecipeBrowser(true)} activeOpacity={0.7}>
            <Sparkle size={16} color={S.dark} weight="bold" />
            <Text style={st.browseBtnText}>Browse</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.addBtn} onPress={() => setShowAddMeal(true)} activeOpacity={0.7}>
            <Plus size={16} color="#FFF" weight="bold" />
            <Text style={st.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {MEAL_TYPES.map(({ type, label, Icon, color }) => {
        const typeMeals = getMealsByType(type);
        if (typeMeals.length === 0) return null;
        return (
          <View key={type} style={{ marginBottom: 16 }}>
            <View style={st.mealTypeHead}>
              <View style={[st.mealTypeIcon, { backgroundColor: color + '15' }]}>
                <Icon size={18} color={color} weight="fill" />
              </View>
              <Text style={st.mealTypeLabel}>{label}</Text>
            </View>
            {typeMeals.map((meal, mealIdx) => {
              const cfg = getMealTypeConfig(meal.type);
              const MIcon = cfg?.Icon || ForkKnife;
              const theme = CARD_THEMES[mealIdx % CARD_THEMES.length];
              return (
                <TouchableOpacity
                  key={meal.id}
                  style={[st.mealCard, { backgroundColor: theme.bg }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedMeal(meal);
                    setShowMealDetail(true);
                  }}
                >
                  <View style={st.mealTop}>
                    {meal.imageUrl ? (
                      <Image source={{ uri: meal.imageUrl }} style={st.mealImg} />
                    ) : (
                      <View style={[st.mealImgFallback, { backgroundColor: cfg?.color || S.green }]}>
                        <MIcon size={26} color="#FFF" weight="fill" />
                      </View>
                    )}
                    <View style={st.mealInfo}>
                      <Text style={st.mealName} numberOfLines={2}>{meal.name}</Text>
                      <View style={st.mealTimeRow}>
                        <Clock size={14} color={S.dim} weight="regular" />
                        <Text style={st.mealTime}>{meal.time}</Text>
                      </View>
                    </View>
                    <View style={st.mealCalBox}>
                      <Text style={st.mealCal}>{meal.calories}</Text>
                      <Text style={st.mealCalLabel}>kcal</Text>
                    </View>
                  </View>

                  <View style={st.mealPillRow}>
                    <View style={[st.mealPill, { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
                      <Text style={[st.mealPillText, { color: S.green }]}>{meal.protein}g protein</Text>
                    </View>
                    <View style={[st.mealPill, { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
                      <Text style={[st.mealPillText, { color: S.amber }]}>{meal.carbs}g carbs</Text>
                    </View>
                    <View style={[st.mealPill, { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
                      <Text style={[st.mealPillText, { color: S.blue }]}>{meal.fats}g fat</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}

      {dailyNutrition.meals.length === 0 && (
        <View style={st.emptyMeals}>
          <ForkKnife size={44} color={S.dim} weight="duotone" />
          <Text style={st.emptyTitle}>No meals logged today</Text>
          <Text style={st.emptySub}>Tap + to add your first meal</Text>
        </View>
      )}
    </View>
  );

  /* ═══════════════════════════════════════════════════════════
     ── MAIN RETURN ──
     ═══════════════════════════════════════════════════════════ */

  return (
    <View style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1, paddingTop: 10 }}>

      {/* ── Content ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── Header ── */}
          <View style={st.header}>
            <View>
              <Text style={st.headerSub}>Nutrition</Text>
              <Text style={st.headerTitle}>
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={st.headerBtn} onPress={() => onNavigate?.('barcode-scanner')}>
                <Barcode size={20} color={S.text} />
              </TouchableOpacity>
              <TouchableOpacity style={st.headerBtn} onPress={() => onNavigate?.('nutrition-calculator')}>
                <Calculator size={20} color={S.text} />
              </TouchableOpacity>
              <TouchableOpacity style={st.headerBtn} onPress={() => setShowSettings(true)}>
                <GearSix size={20} color={S.text} />
              </TouchableOpacity>
            </View>
          </View>
          {/* Calorie Hero */}
          {renderCalorieHero()}

          {/* Water */}
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>{renderWater()}</View>

          {/* Suggestions */}
          {renderSuggestions()}

          {/* Meals */}
          {renderMeals()}
        </Animated.View>
      </ScrollView>

      {/* ═══════════════════════════════════════════════════
         ── ADD MEAL MODAL ──
         ═══════════════════════════════════════════════════ */}
      <Modal visible={showAddMeal} animationType="none" transparent onRequestClose={() => setShowAddMeal(false)}>
        <View style={st.overlay}>
          <View style={st.sheet}>
            <View style={st.handle} />
            <View style={st.sheetTop}>
              <Text style={st.sheetTitle}>Add Meal</Text>
              <TouchableOpacity onPress={() => setShowAddMeal(false)} style={st.closeBtn}>
                <X size={18} color={S.dim} weight="bold" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
              <View style={st.field}>
                <Text style={st.fieldLabel}>MEAL NAME</Text>
                <TextInput
                  style={st.input}
                  value={mealName}
                  onChangeText={setMealName}
                  placeholder="e.g. Grilled Chicken Salad"
                  placeholderTextColor={S.dim}
                />
              </View>

              <View style={st.field}>
                <Text style={st.fieldLabel}>MEAL TYPE</Text>
                <View style={st.typeGrid}>
                  {MEAL_TYPES.map(({ type, label, Icon, color }) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        st.typeOpt,
                        mealType === type && { backgroundColor: color + '15', borderColor: color },
                      ]}
                      onPress={() => setMealType(type)}
                    >
                      <Icon
                        size={20}
                        color={mealType === type ? color : S.dim}
                        weight={mealType === type ? 'fill' : 'regular'}
                      />
                      <Text style={[st.typeOptText, mealType === type && { color }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={st.field}>
                <Text style={st.fieldLabel}>CALORIES</Text>
                <TextInput
                  style={st.input}
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={S.dim}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[st.field, { flex: 1 }]}>
                  <Text style={st.fieldLabel}>PROTEIN (G)</Text>
                  <TextInput
                    style={st.input}
                    value={protein}
                    onChangeText={setProtein}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={S.dim}
                  />
                </View>
                <View style={[st.field, { flex: 1 }]}>
                  <Text style={st.fieldLabel}>CARBS (G)</Text>
                  <TextInput
                    style={st.input}
                    value={carbs}
                    onChangeText={setCarbs}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={S.dim}
                  />
                </View>
              </View>

              <View style={st.field}>
                <Text style={st.fieldLabel}>FATS (G)</Text>
                <TextInput
                  style={st.input}
                  value={fats}
                  onChangeText={setFats}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={S.dim}
                />
              </View>

              <TouchableOpacity style={st.submitBtn} onPress={handleAddMeal} activeOpacity={0.8}>
                <Text style={st.submitText}>Add Meal</Text>
              </TouchableOpacity>
              <View style={{ height: 34 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════
         ── WATER MODAL ──
         ═══════════════════════════════════════════════════ */}
      <Modal visible={showWaterModal} animationType="none" transparent onRequestClose={() => setShowWaterModal(false)}>
        <TouchableOpacity style={st.centerOverlay} activeOpacity={1} onPress={() => setShowWaterModal(false)}>
          <View style={st.waterModal}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={[st.iconBadgeLg, { backgroundColor: S.teal + '15' }]}>
                <Drop size={32} color={S.teal} weight="fill" />
              </View>
              <Text style={st.waterModalTitle}>Add Water</Text>
              <Text style={st.waterModalSub}>Select amount</Text>
            </View>

            <View style={st.waterGrid}>
              {WATER_AMOUNTS.map(amt => (
                <TouchableOpacity key={amt} style={st.waterOpt} onPress={() => handleAddWater(amt)} activeOpacity={0.7}>
                  <Drop size={28} color={S.teal} weight="duotone" />
                  <Text style={st.waterOptText}>{amt}ml</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={() => setShowWaterModal(false)} style={{ alignItems: 'center', paddingTop: 12 }}>
              <Text style={{ fontFamily: F.semi, fontSize: 14, color: S.dim }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══════════════════════════════════════════════════
         ── MEAL DETAIL MODAL ──
         ═══════════════════════════════════════════════════ */}
      <Modal
        visible={showMealDetail}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMealDetail(false)}
      >
        {selectedMeal &&
          (() => {
            const cfg = getMealTypeConfig(selectedMeal.type);
            const MIcon = cfg?.Icon || ForkKnife;
            const mealColor = cfg?.color || S.green;
            const detailBg = DETAIL_BG[selectedMeal.type] || DETAIL_BG.dinner;
            return (
              <View style={[st.dtContainer, { backgroundColor: detailBg }]}>
                <StatusBar barStyle="dark-content" />
                <SafeAreaView style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 30 }}>
                  {/* Back button */}
                  <TouchableOpacity style={st.dtBackBtn} onPress={() => setShowMealDetail(false)}>
                    <ArrowLeft size={22} color={S.dark} weight="bold" />
                  </TouchableOpacity>
                  {/* Centered circular image */}
                  <View style={st.dtImgWrap}>
                    {selectedMeal.imageUrl ? (
                      <Image source={{ uri: selectedMeal.imageUrl }} style={st.dtImg} />
                    ) : (
                      <View style={[st.dtImgFallback, { backgroundColor: mealColor + '30' }]}>
                        <MIcon size={80} color={mealColor} weight="duotone" />
                      </View>
                    )}
                  </View>

                  {/* Title + kcal */}
                  <View style={st.dtInfo}>
                    <Text style={st.dtTitle}>{selectedMeal.name}, {selectedMeal.calories} Kcal</Text>
                    {selectedMeal.notes ? (
                      <Text style={st.dtDesc}>{selectedMeal.notes}</Text>
                    ) : (
                      <View style={st.dtMetaRow}>
                        <View style={[st.dtTypeTag, { backgroundColor: mealColor + '18' }]}>
                          <MIcon size={12} color={mealColor} weight="fill" />
                          <Text style={[st.dtTypeTagText, { color: mealColor }]}>
                            {selectedMeal.type.charAt(0).toUpperCase() + selectedMeal.type.slice(1)}
                          </Text>
                        </View>
                        <View style={st.dtTimeDot} />
                        <Clock size={13} color="#AAA" weight="regular" />
                        <Text style={st.dtTimeText}>{selectedMeal.time}</Text>
                      </View>
                    )}
                  </View>

                  {/* Macro boxes with borders */}
                  <View style={st.dtMacroRow}>
                    <View style={st.dtMacroBox}>
                      <Text style={st.dtMacroLabel}>protein</Text>
                      <Text style={st.dtMacroVal}>{selectedMeal.protein} g</Text>
                    </View>
                    <View style={st.dtMacroBox}>
                      <Text style={st.dtMacroLabel}>fat</Text>
                      <Text style={st.dtMacroVal}>{selectedMeal.fats} g</Text>
                    </View>
                    <View style={[st.dtMacroBox, { borderRightWidth: 1.5 }]}>
                      <Text style={st.dtMacroLabel}>carbs</Text>
                      <Text style={st.dtMacroVal}>{selectedMeal.carbs} g</Text>
                    </View>
                  </View>

                  {/* Ingredients */}
                  {selectedMeal.ingredients && selectedMeal.ingredients.length > 0 && (
                    <View style={st.dtSection}>
                      <Text style={st.dtSecTitle}>ingredients:</Text>
                      {selectedMeal.ingredients.map((ing, i) => (
                        <View key={i} style={st.dtIngRow}>
                          <View style={st.dtIngDot} />
                          <Text style={st.dtIngText}>{ing}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Bottom */}
                  <View style={st.dtFooter}>
                    <TouchableOpacity style={st.dtDelBtn} onPress={handleDeleteMeal}>
                      <Trash size={18} color="#EF4444" weight="bold" />
                    </TouchableOpacity>
                    <TouchableOpacity style={st.dtMainBtn} onPress={() => setShowMealDetail(false)} activeOpacity={0.85}>
                      <Text style={st.dtMainBtnText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
                </SafeAreaView>
              </View>
            );
          })()}
      </Modal>

      {/* ── Recipe Browser ── */}
      <RecipeBrowser
        visible={showRecipeBrowser}
        onClose={() => setShowRecipeBrowser(false)}
        onSelectRecipe={handleSelectRecipe}
      />

      {/* ═══════════════════════════════════════════════════
         ── SETTINGS MODAL ──
         ═══════════════════════════════════════════════════ */}
      <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
        <View style={st.settingsOverlay}>
          <View style={st.settingsSheet}>
            {/* Header */}
            <View style={st.settingsHeader}>
              <TouchableOpacity onPress={() => setShowSettings(false)} style={st.settingsBackBtn}>
                <X size={18} color={S.dark} weight="bold" />
              </TouchableOpacity>
              <Text style={st.settingsTitle}>Settings</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              {/* Daily Goals */}
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={st.settingsSecTitle}>Daily Goals</Text>

                {/* Calories — hero card */}
                <View style={[st.goalCard, { backgroundColor: '#FEF4E8' }]}>
                  <View style={st.goalCardTop}>
                    <View style={[st.goalIcon, { backgroundColor: S.amber + '20' }]}>
                      <Fire size={22} color={S.amber} weight="fill" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={st.goalCardLabel}>Calories</Text>
                      {editingGoal === 'calories' ? (
                        <TextInput
                          style={st.goalInput}
                          value={editValue}
                          onChangeText={setEditValue}
                          keyboardType="numeric"
                          autoFocus
                        />
                      ) : (
                        <Text style={st.goalCardValue}>{goals.calories} <Text style={st.goalCardUnit}>kcal</Text></Text>
                      )}
                    </View>
                    {editingGoal === 'calories' ? (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity onPress={handleSaveGoal} style={[st.goalAction, { backgroundColor: S.green + '18' }]}>
                          <Check size={18} color={S.green} weight="bold" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleCancelEdit} style={st.goalAction}>
                          <X size={18} color={S.dim} weight="bold" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => handleEditGoal('calories', goals.calories)} style={st.goalAction}>
                        <PencilSimple size={18} color={S.dim} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Macros — 2x2 grid */}
                <View style={st.goalGrid}>
                  {[
                    { key: 'protein', label: 'Protein', unit: 'g', value: goals.protein, bg: '#E8F5E9', iconBg: S.green + '20', icon: <Barbell size={20} color={S.green} weight="fill" /> },
                    { key: 'carbs', label: 'Carbs', unit: 'g', value: goals.carbs, bg: '#FFF3E0', iconBg: S.amber + '20', icon: <Lightning size={20} color={S.amber} weight="fill" /> },
                    { key: 'fats', label: 'Fats', unit: 'g', value: goals.fats, bg: '#EEF1FD', iconBg: S.blue + '20', icon: <Drop size={20} color={S.blue} weight="fill" /> },
                    { key: 'water', label: 'Water', unit: 'ml', value: goals.water, bg: '#E0F7FA', iconBg: S.teal + '20', icon: <Drop size={20} color={S.teal} weight="fill" /> },
                  ].map((item) => (
                    <View key={item.key} style={[st.goalGridCard, { backgroundColor: item.bg }]}>
                      <View style={st.goalGridTop}>
                        <View style={[st.goalGridIcon, { backgroundColor: item.iconBg }]}>
                          {item.icon}
                        </View>
                        {editingGoal === item.key ? (
                          <View style={{ flexDirection: 'row', gap: 4 }}>
                            <TouchableOpacity onPress={handleSaveGoal} style={[st.goalGridAction, { backgroundColor: S.green + '18' }]}>
                              <Check size={14} color={S.green} weight="bold" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCancelEdit} style={st.goalGridAction}>
                              <X size={14} color={S.dim} weight="bold" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity onPress={() => handleEditGoal(item.key, item.value)} style={st.goalGridAction}>
                            <PencilSimple size={14} color={S.dim} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={st.goalGridLabel}>{item.label}</Text>
                      {editingGoal === item.key ? (
                        <TextInput
                          style={st.goalGridInput}
                          value={editValue}
                          onChangeText={setEditValue}
                          keyboardType="numeric"
                          autoFocus
                        />
                      ) : (
                        <Text style={st.goalGridValue}>{item.value} <Text style={st.goalGridUnit}>{item.unit}</Text></Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* Preferences */}
              <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
                <Text style={st.settingsSecTitle}>Preferences</Text>

                <View style={st.prefCard}>
                  <View style={[st.goalIcon, { backgroundColor: mealRemindersEnabled ? S.lime + '30' : '#F2F2F2' }]}>
                    <Bell
                      size={20}
                      color={mealRemindersEnabled ? S.dark : S.dim}
                      weight={mealRemindersEnabled ? 'fill' : 'regular'}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={st.prefLabel}>Meal Reminders</Text>
                    <Text style={st.prefSub}>Get notified for meal times</Text>
                  </View>
                  <TouchableOpacity
                    onPress={toggleMealReminders}
                    style={[st.toggle, mealRemindersEnabled && st.toggleOn]}
                  >
                    <View style={[st.toggleKnob, mealRemindersEnabled && st.toggleKnobOn]} />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </View>
  );
};

/* ═══════════════════════════════════════════════════════════
   ── STYLES ──
   ═══════════════════════════════════════════════════════════ */

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: S.bg },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerSub: { fontFamily: F.medium, fontSize: 13, color: S.dim, marginBottom: 2 },
  headerTitle: { fontFamily: F.bold, fontSize: 22, color: S.text, letterSpacing: -0.5 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Calorie Hero */
  heroCard: {
    backgroundColor: S.warmBg,
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 24,
    marginTop: 8,
    marginBottom: 24,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ringWrap: { position: 'relative' },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringVal: { fontFamily: F.bold, fontSize: 34, color: S.text, lineHeight: 38 },
  ringUnit: { fontFamily: F.medium, fontSize: 12, color: S.dim, marginTop: 1 },

  heroRight: { flex: 1, marginLeft: 24 },
  heroGoalLabel: { fontFamily: F.medium, fontSize: 11, color: S.dim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  heroGoalVal: { fontFamily: F.bold, fontSize: 28, color: S.text, letterSpacing: -0.5, marginBottom: 10 },
  heroRemaining: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: S.green + '14', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  heroRemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: S.green },
  heroRemText: { fontFamily: F.semi, fontSize: 12, color: S.green },

  /* Macro strip */
  macroStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  macroStripItem: { alignItems: 'center', gap: 3 },
  macroStripDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  macroStripVal: { fontFamily: F.bold, fontSize: 16, color: S.text },
  macroStripLabel: { fontFamily: F.medium, fontSize: 11, color: S.dim },
  macroStripDiv: { width: 1, height: 28, backgroundColor: 'rgba(0,0,0,0.08)' },

  /* Water */
  waterCard: {
    backgroundColor: S.card,
    borderRadius: 24,
    padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  waterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  waterLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waterTitle: { fontFamily: F.bold, fontSize: 17, color: S.text, letterSpacing: -0.3 },
  waterSub: { fontFamily: F.medium, fontSize: 12, color: S.dim, marginTop: 1 },
  waterAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: S.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterBarTrack: {
    height: 10,
    backgroundColor: '#F2F2F2',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  waterBarFill: { height: '100%', borderRadius: 5, backgroundColor: S.teal },
  waterPct: { fontFamily: F.medium, fontSize: 12, color: S.dim, textAlign: 'center' },
  waterList: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: S.border,
    paddingTop: 12,
  },
  waterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 6,
  },
  waterItemAmt: { fontFamily: F.semi, fontSize: 14, color: S.teal },
  waterItemTime: { fontFamily: F.regular, fontSize: 12, color: S.dim, flex: 1 },
  waterDel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: S.red + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Icon badges */
  iconBadge: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  iconBadgeLg: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  /* Section headers */
  secHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  secHead2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  secTitle: { fontFamily: F.bold, fontSize: 20, color: S.text, letterSpacing: -0.5 },
  secSub: { fontFamily: F.medium, fontSize: 12, color: S.dim, marginTop: 2 },
  viewAll: { fontFamily: F.semi, fontSize: 13, color: S.dim },

  /* Suggestion cards — editorial recipe cards with warm tints */
  sugCard: {
    width: width * 0.62,
    marginRight: 12,
    borderRadius: 24,
    overflow: 'hidden',
  },
  sugImgWrap: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
  },
  sugImg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sugBadgeRow: {
    position: 'absolute',
    top: 168,
    right: 12,
    flexDirection: 'row',
    gap: 6,
  },
  sugBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sugBadgeText: {
    fontFamily: F.semi,
    fontSize: 11,
    color: S.text,
  },
  sugBody: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  sugType: {
    fontFamily: F.bold,
    fontSize: 10,
    color: S.dim,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sugName: {
    fontFamily: F.bold,
    fontSize: 18,
    color: S.text,
    letterSpacing: -0.4,
    lineHeight: 23,
    marginBottom: 6,
  },
  sugDesc: {
    fontFamily: F.medium,
    fontSize: 12,
    color: S.dim,
    letterSpacing: -0.1,
  },

  /* Meal action buttons */
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F2F2F2',
  },
  browseBtnText: { fontFamily: F.semi, fontSize: 13, color: S.dark },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: S.dark,
  },
  addBtnText: { fontFamily: F.semi, fontSize: 13, color: '#FFF' },

  /* Meal type headers */
  mealTypeHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  mealTypeIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealTypeLabel: { fontFamily: F.semi, fontSize: 15, color: S.text },

  /* Meal card */
  mealCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },
  mealTop: { flexDirection: 'row', alignItems: 'center' },
  mealImg: {
    width: 56,
    height: 56,
    borderRadius: 18,
    resizeMode: 'cover' as any,
  },
  mealImgFallback: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealInfo: { flex: 1, paddingHorizontal: 14 },
  mealName: {
    fontFamily: F.bold,
    fontSize: 16,
    color: '#111',
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  mealTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mealTime: { fontFamily: F.medium, fontSize: 12, color: '#8C8C8C' },
  mealCalBox: { alignItems: 'flex-end' },
  mealCal: { fontFamily: F.bold, fontSize: 24, color: '#111', letterSpacing: -1, lineHeight: 28 },
  mealCalLabel: { fontFamily: F.medium, fontSize: 11, color: '#8C8C8C' },
  mealPillRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  mealPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  mealPillText: {
    fontFamily: F.semi,
    fontSize: 11,
    letterSpacing: -0.1,
  },

  /* Empty state */
  emptyMeals: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontFamily: F.semi, fontSize: 16, color: S.dim, marginTop: 14 },
  emptySub: { fontFamily: F.regular, fontSize: 13, color: S.dim, marginTop: 4 },

  /* ── Modal shared ── */
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'flex-end' },
  centerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  sheetTitle: { fontFamily: F.bold, fontSize: 24, color: S.text, letterSpacing: -0.7 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Form fields */
  field: { marginTop: 18 },
  fieldLabel: {
    fontFamily: F.semi,
    fontSize: 11,
    color: S.dim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontFamily: F.medium,
    fontSize: 16,
    color: S.text,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeOpt: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  typeOptText: { fontFamily: F.semi, fontSize: 13, color: S.dim },
  submitBtn: {
    marginTop: 24,
    backgroundColor: S.dark,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
  },
  submitText: { fontFamily: F.bold, fontSize: 15, color: '#FFF', letterSpacing: -0.2 },

  /* Water modal */
  waterModal: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 380,
  },
  waterModalTitle: { fontFamily: F.bold, fontSize: 22, color: S.text, letterSpacing: -0.5 },
  waterModalSub: { fontFamily: F.medium, fontSize: 13, color: S.dim, marginTop: 4 },
  waterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 8,
  },
  waterOpt: {
    width: (width - 120) / 2,
    aspectRatio: 1.2,
    backgroundColor: S.teal + '08',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: S.teal + '30',
  },
  waterOptText: { fontFamily: F.semi, fontSize: 15, color: S.teal, marginTop: 6 },

  /* ── Detail Modal ── */
  dtContainer: { flex: 1 },

  dtBackBtn: {
    marginTop: 14,
    marginLeft: 20,
    marginBottom: 0,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },

  /* Centered circular image */
  dtImgWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  dtImg: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: width * 0.325,
    resizeMode: 'cover' as any,
  },
  dtImgFallback: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: width * 0.325,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Title + desc */
  dtInfo: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  dtTitle: {
    fontFamily: F.bold,
    fontSize: 26,
    color: '#111',
    letterSpacing: -0.6,
    lineHeight: 32,
    marginBottom: 6,
  },
  dtDesc: {
    fontFamily: F.medium,
    fontSize: 15,
    color: '#555',
    lineHeight: 23,
  },
  dtMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dtTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dtTypeTagText: {
    fontFamily: F.bold,
    fontSize: 12,
  },
  dtTimeDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#CCC',
    marginHorizontal: 2,
  },
  dtTimeText: {
    fontFamily: F.medium,
    fontSize: 13,
    color: '#AAA',
  },

  /* Macro boxes with borders */
  dtMacroRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 0,
    marginBottom: 24,
  },
  dtMacroBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#111',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRightWidth: 0,
  },
  dtMacroLabel: {
    fontFamily: F.medium,
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dtMacroVal: {
    fontFamily: F.bold,
    fontSize: 22,
    color: '#111',
    letterSpacing: -0.4,
  },

  /* Sections */
  dtSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  dtSecTitle: {
    fontFamily: F.bold,
    fontSize: 20,
    color: '#111',
    letterSpacing: -0.4,
    marginBottom: 16,
  },

  /* Ingredients */
  dtIngRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  dtIngDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#111',
    marginTop: 7,
  },
  dtIngText: {
    fontFamily: F.medium,
    fontSize: 15,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },

  /* Footer */
  dtFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 30,
  },
  dtDelBtn: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dtMainBtn: {
    flex: 1,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dtMainBtnText: {
    fontFamily: F.bold,
    fontSize: 16,
    color: '#FFF',
    letterSpacing: -0.2,
  },

  /* ── Settings Modal ── */
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: S.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  settingsBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsTitle: {
    fontFamily: F.bold,
    fontSize: 22,
    color: S.text,
    letterSpacing: -0.5,
  },
  settingsSecTitle: {
    fontFamily: F.bold,
    fontSize: 20,
    color: S.text,
    letterSpacing: -0.5,
    marginBottom: 14,
  },

  /* Goal hero card (calories) */
  goalCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
  },
  goalCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalCardLabel: {
    fontFamily: F.medium,
    fontSize: 13,
    color: S.dim,
    marginBottom: 2,
  },
  goalCardValue: {
    fontFamily: F.bold,
    fontSize: 28,
    color: S.dark,
    letterSpacing: -0.8,
  },
  goalCardUnit: {
    fontFamily: F.medium,
    fontSize: 14,
    color: S.dim,
  },

  /* Goal grid (2x2) */
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  goalGridCard: {
    width: (width - 52) / 2,
    borderRadius: 22,
    padding: 16,
  },
  goalGridTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  goalGridIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalGridAction: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalGridLabel: {
    fontFamily: F.medium,
    fontSize: 13,
    color: S.dim,
    marginBottom: 4,
  },
  goalGridValue: {
    fontFamily: F.bold,
    fontSize: 24,
    color: S.dark,
    letterSpacing: -0.6,
  },
  goalGridUnit: {
    fontFamily: F.medium,
    fontSize: 13,
    color: S.dim,
  },
  goalGridInput: {
    fontFamily: F.bold,
    fontSize: 22,
    color: S.text,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: S.lime,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },

  goalIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalInput: {
    fontFamily: F.bold,
    fontSize: 24,
    color: S.text,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: S.lime,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
    minWidth: 100,
    letterSpacing: -0.5,
  },
  goalAction: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Preferences */
  prefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: S.card,
    borderRadius: 22,
    padding: 18,
  },
  prefLabel: {
    fontFamily: F.semi,
    fontSize: 15,
    color: S.text,
  },
  prefSub: {
    fontFamily: F.regular,
    fontSize: 12,
    color: S.dim,
    marginTop: 2,
  },

  /* Toggle */
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: S.dark },
  toggleKnob: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFF' },
  toggleKnobOn: { transform: [{ translateX: 22 }] },
});
