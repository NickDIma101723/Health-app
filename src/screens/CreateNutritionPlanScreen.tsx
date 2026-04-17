import React, { useState } from 'react';
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
  Dimensions,
} from 'react-native';
import {
  ArrowLeft,
  Plus,
  X,
  Trash,
  MagnifyingGlass,
  ForkKnife,
  Sun,
  CookingPot,
  Cookie,
  Clock,
  Fire,
  Barbell,
  Lightning,
  Drop,
  Minus,
  Check,
  CalendarBlank,
  Note,
} from 'phosphor-react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Users } from 'phosphor-react-native';

const { width } = Dimensions.get('window');

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
  text: '#1A1A1A',
  dim: '#8C8C8C',
  border: '#EEEEEE',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  teal: '#14B8A6',
  lime: '#D4F940',
} as const;

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
  day_of_week: number;
  portion_size: number;
  notes?: string;
}

const SAMPLE_RECIPES: Recipe[] = [
  {
    id: '1', name: 'Grilled Chicken Breast', category: 'Protein',
    calories: 231, protein: 43.5, carbs: 0, fats: 5.0,
    ingredients: ['Chicken breast', 'Olive oil', 'Salt', 'Pepper', 'Garlic powder'],
    instructions: 'Season chicken breast and grill for 6-8 minutes per side.', prep_time: 15, serving_size: '150g',
  },
  {
    id: '2', name: 'Brown Rice Bowl', category: 'Carbs',
    calories: 218, protein: 4.5, carbs: 45, fats: 1.6,
    ingredients: ['Brown rice', 'Water', 'Salt'],
    instructions: 'Cook brown rice according to package directions.', prep_time: 25, serving_size: '1 cup',
  },
  {
    id: '3', name: 'Greek Yogurt Parfait', category: 'Breakfast',
    calories: 190, protein: 15, carbs: 25, fats: 4,
    ingredients: ['Greek yogurt', 'Berries', 'Granola', 'Honey'],
    instructions: 'Layer yogurt, berries, and granola. Drizzle with honey.', prep_time: 5, serving_size: '1 cup',
  },
  {
    id: '4', name: 'Salmon Fillet', category: 'Protein',
    calories: 367, protein: 25, carbs: 0, fats: 30,
    ingredients: ['Salmon fillet', 'Lemon', 'Dill', 'Salt', 'Pepper'],
    instructions: 'Bake salmon at 400°F for 12-15 minutes.', prep_time: 20, serving_size: '150g',
  },
  {
    id: '5', name: 'Quinoa Salad', category: 'Carbs',
    calories: 222, protein: 8, carbs: 40, fats: 3.6,
    ingredients: ['Quinoa', 'Cucumber', 'Tomatoes', 'Red onion', 'Lemon vinaigrette'],
    instructions: 'Cook quinoa, cool, and mix with chopped vegetables and dressing.', prep_time: 20, serving_size: '1 cup',
  },
  {
    id: '6', name: 'Avocado Toast', category: 'Snack',
    calories: 234, protein: 6, carbs: 12, fats: 21,
    ingredients: ['Whole grain bread', 'Avocado', 'Salt', 'Pepper', 'Lemon juice'],
    instructions: 'Toast bread, mash avocado with seasonings, and spread.', prep_time: 5, serving_size: '1 slice',
  },
];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

const MEAL_TYPE_ICONS: Record<string, any> = {
  breakfast: Sun,
  lunch: ForkKnife,
  dinner: CookingPot,
  snack: Cookie,
};

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: S.amber,
  lunch: S.green,
  dinner: S.blue,
  snack: S.purple,
};

const DAY_THEMES = ['#F0F7E6', '#FEF4E8', '#FFF0F0', '#EEF1FD', '#FDF4FF', '#E8F5E9', '#FFF3E0'];

export const CreateNutritionPlanScreen: React.FC<CreateNutritionPlanScreenProps> = ({
  route,
  navigation,
  clientId: propClientId,
  onBack,
}) => {
  const { coachData } = useAuth();
  const clientId = propClientId || route?.params?.clientId;

  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientId || null);
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  React.useEffect(() => {
    if (!clientId && coachData?.id) {
      loadClients();
    }
  }, [coachData, clientId]);

  const loadClients = async () => {
    setLoadingClients(true);
    const { data: assignments } = await supabase
      .from('coach_client_assignments')
      .select('client_user_id')
      .eq('coach_id', coachData!.id)
      .eq('is_active', true);
    
    if (assignments && assignments.length > 0) {
      const ids = assignments.map(a => a.client_user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', ids);
      if (profiles) setClients(profiles);
    }
    setLoadingClients(false);
  };

  if (!selectedClientId) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => handleBack()} style={st.backBtn}>
            <ArrowLeft color={S.text} size={24} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Select Client</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={{ padding: 20 }}>
          <Text style={{ fontSize: 16, color: S.dim, marginBottom: 20 }}>Who is this nutrition plan for?</Text>
          {loadingClients ? (
            <Text style={{ color: S.text }}>Loading clients...</Text>
          ) : clients.length === 0 ? (
            <Text style={{ color: S.text }}>No active clients found.</Text>
          ) : (
            clients.map(c => (
              <TouchableOpacity key={c.user_id} style={{ padding: 15, backgroundColor: S.card, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }} onPress={() => setSelectedClientId(c.user_id)}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: S.amber, alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                  <Users color="#111" size={20} />
                </View>
                <Text style={{ fontSize: 16, fontFamily: F.bold, color: S.text }}>{c.full_name || 'Client'}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

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
  const [expandedDay, setExpandedDay] = useState<number>(0);

  const recipeCategories = ['All', 'Breakfast', 'Protein', 'Carbs', 'Snack'];

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
      notes: '',
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

  const getMealsForDay = (day: number) => mealPlans.filter(meal => meal.day_of_week === day);

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
    if (!planName.trim()) { Alert.alert('Error', 'Please enter a plan name'); return; }
    if (mealPlans.length === 0) { Alert.alert('Error', 'Please add at least one meal'); return; }

    try {
      const nutritionPlan = {
        coach_id: coachData?.id,
        client_id: selectedClientId,
        name: planName,
        description: planDescription,
        target_calories: parseInt(targetCalories) || 2000,
        target_protein: parseInt(targetProtein) || 150,
        target_carbs: parseInt(targetCarbs) || 200,
        target_fats: parseInt(targetFats) || 65,
        meal_plans: mealPlans,
        created_at: new Date().toISOString(),
        is_active: true,
      };

      const { error } = await supabase.from('nutrition_plans').insert(nutritionPlan);
      if (error) throw error;

      Alert.alert('Success', 'Nutrition plan created!', [{ text: 'OK', onPress: () => handleBack() }]);
    } catch (error) {
      console.error('Error saving nutrition plan:', error);
      Alert.alert('Error', 'Failed to save nutrition plan.');
    }
  };

  const handleBack = () => {
    if (onBack) onBack();
    else if (navigation) navigation.goBack();
  };

  return (
    <View style={st.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity style={st.backBtn} onPress={handleBack}>
            <ArrowLeft size={20} color={S.dark} weight="bold" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Create Nutrition Plan</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Plan Details */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>Plan Details</Text>
            <View style={st.card}>
              <Text style={st.fieldLabel}>Plan Name</Text>
              <TextInput
                style={st.input}
                value={planName}
                onChangeText={setPlanName}
                placeholder="e.g., Weight Loss Meal Plan"
                placeholderTextColor="#CCC"
              />

              <View style={{ height: 16 }} />

              <Text style={st.fieldLabel}>Description</Text>
              <TextInput
                style={[st.input, { height: 80, textAlignVertical: 'top', paddingTop: 14 }]}
                value={planDescription}
                onChangeText={setPlanDescription}
                placeholder="Goals and approach..."
                placeholderTextColor="#CCC"
                multiline
              />
            </View>
          </View>

          {/* Nutrition Targets */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>Daily Targets</Text>
            <View style={st.targetRow}>
              <View style={[st.targetCard, { backgroundColor: '#FEF4E8' }]}>
                <Fire size={18} color={S.amber} weight="fill" />
                <Text style={st.targetLabel}>Calories</Text>
                <TextInput style={st.targetInput} value={targetCalories} onChangeText={setTargetCalories} keyboardType="numeric" />
              </View>
              <View style={[st.targetCard, { backgroundColor: '#E8F5E9' }]}>
                <Barbell size={18} color={S.green} weight="fill" />
                <Text style={st.targetLabel}>Protein</Text>
                <TextInput style={st.targetInput} value={targetProtein} onChangeText={setTargetProtein} keyboardType="numeric" />
                <Text style={st.targetUnit}>g</Text>
              </View>
            </View>
            <View style={st.targetRow}>
              <View style={[st.targetCard, { backgroundColor: '#FFF3E0' }]}>
                <Lightning size={18} color={S.amber} weight="fill" />
                <Text style={st.targetLabel}>Carbs</Text>
                <TextInput style={st.targetInput} value={targetCarbs} onChangeText={setTargetCarbs} keyboardType="numeric" />
                <Text style={st.targetUnit}>g</Text>
              </View>
              <View style={[st.targetCard, { backgroundColor: '#EEF1FD' }]}>
                <Drop size={18} color={S.blue} weight="fill" />
                <Text style={st.targetLabel}>Fats</Text>
                <TextInput style={st.targetInput} value={targetFats} onChangeText={setTargetFats} keyboardType="numeric" />
                <Text style={st.targetUnit}>g</Text>
              </View>
            </View>
          </View>

          {/* Weekly Meal Plan */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>Weekly Meal Plan</Text>

            {/* Day tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {DAYS_SHORT.map((day, idx) => {
                const dayMeals = getMealsForDay(idx);
                const isActive = expandedDay === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[st.dayTab, isActive && st.dayTabActive]}
                    onPress={() => setExpandedDay(idx)}
                  >
                    <Text style={[st.dayTabText, isActive && st.dayTabTextActive]}>{day}</Text>
                    {dayMeals.length > 0 && (
                      <View style={[st.dayDot, isActive && { backgroundColor: '#FFF' }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Active day card */}
            {(() => {
              const dayNutrition = getDayTotalNutrition(expandedDay);
              const dayMeals = getMealsForDay(expandedDay);

              return (
                <View style={[st.dayCard, { backgroundColor: DAY_THEMES[expandedDay % DAY_THEMES.length] }]}>
                  <View style={st.dayHeader}>
                    <View>
                      <Text style={st.dayName}>{DAYS_OF_WEEK[expandedDay]}</Text>
                      {dayMeals.length > 0 && (
                        <Text style={st.dayStats}>
                          {Math.round(dayNutrition.calories)} cal · P:{Math.round(dayNutrition.protein)}g · C:{Math.round(dayNutrition.carbs)}g · F:{Math.round(dayNutrition.fats)}g
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Meal type slots */}
                  {MEAL_TYPES.map((mealType) => {
                    const MIcon = MEAL_TYPE_ICONS[mealType];
                    const mealColor = MEAL_TYPE_COLORS[mealType];
                    const mealsForType = dayMeals.filter(m => m.meal_type === mealType);

                    return (
                      <View key={mealType} style={st.mealSlot}>
                        <View style={st.mealSlotHeader}>
                          <View style={[st.mealSlotIcon, { backgroundColor: mealColor + '18' }]}>
                            <MIcon size={16} color={mealColor} weight="fill" />
                          </View>
                          <Text style={st.mealSlotTitle}>
                            {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                          </Text>
                          <TouchableOpacity
                            style={st.mealSlotAdd}
                            onPress={() => {
                              setSelectedDay(expandedDay);
                              setSelectedMealType(mealType);
                              setShowRecipeModal(true);
                            }}
                          >
                            <Plus size={14} color={S.dark} weight="bold" />
                          </TouchableOpacity>
                        </View>

                        {mealsForType.map((meal) => (
                          <View key={meal.id} style={st.assignedMeal}>
                            <View style={{ flex: 1 }}>
                              <Text style={st.assignedName}>{meal.recipe.name}</Text>
                              <Text style={st.assignedMacros}>
                                {Math.round(meal.recipe.calories * meal.portion_size)} cal · P:{Math.round(meal.recipe.protein * meal.portion_size)}g
                              </Text>
                            </View>
                            <View style={st.portionRow}>
                              <TouchableOpacity
                                style={st.portionBtn}
                                onPress={() => updateMealPortion(meal.id, Math.max(0.5, meal.portion_size - 0.5))}
                              >
                                <Minus size={12} color={S.dim} weight="bold" />
                              </TouchableOpacity>
                              <Text style={st.portionText}>{meal.portion_size}x</Text>
                              <TouchableOpacity
                                style={st.portionBtn}
                                onPress={() => updateMealPortion(meal.id, meal.portion_size + 0.5)}
                              >
                                <Plus size={12} color={S.dim} weight="bold" />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => removeMeal(meal.id)} style={st.removeMealBtn}>
                                <Trash size={14} color={S.red} weight="bold" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </View>
              );
            })()}
          </View>

          {/* Save Button */}
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <TouchableOpacity style={st.saveBtn} onPress={savePlan} activeOpacity={0.85}>
              <Check size={20} color="#FFF" weight="bold" />
              <Text style={st.saveBtnText}>Save Nutrition Plan</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Recipe Selection Modal */}
        <Modal visible={showRecipeModal} animationType="slide" transparent={false} onRequestClose={() => setShowRecipeModal(false)}>
          <View style={st.modalContainer}>
            <SafeAreaView style={{ flex: 1 }}>
              {/* Modal header */}
              <View style={st.modalHeader}>
                <TouchableOpacity style={st.backBtn} onPress={() => setShowRecipeModal(false)}>
                  <ArrowLeft size={20} color={S.dark} weight="bold" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.modalTitle}>Select Recipe</Text>
                  <Text style={st.modalSub}>
                    {DAYS_OF_WEEK[selectedDay]} · {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}
                  </Text>
                </View>
              </View>

              {/* Search */}
              <View style={st.searchWrap}>
                <MagnifyingGlass size={18} color={S.dim} weight="bold" />
                <TextInput
                  style={st.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search recipes..."
                  placeholderTextColor="#CCC"
                />
              </View>

              {/* Category chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44, paddingHorizontal: 20, marginBottom: 12 }}>
                {recipeCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[st.catChip, (selectedCategory === cat || (!selectedCategory && cat === 'All')) && st.catChipActive]}
                    onPress={() => setSelectedCategory(cat === 'All' ? null : cat)}
                  >
                    <Text style={[st.catChipText, (selectedCategory === cat || (!selectedCategory && cat === 'All')) && st.catChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Recipe list */}
              <FlatList
                data={filteredRecipes}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                renderItem={({ item, index }) => {
                  const theme = DAY_THEMES[index % DAY_THEMES.length];
                  return (
                    <TouchableOpacity
                      style={[st.recipeCard, { backgroundColor: theme }]}
                      onPress={() => addMealToDay(selectedDay, selectedMealType, item)}
                      activeOpacity={0.85}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={st.recipeName}>{item.name}</Text>
                        <View style={st.recipePillRow}>
                          <View style={st.recipePill}>
                            <Text style={st.recipePillText}>{item.calories} kcal</Text>
                          </View>
                          <View style={st.recipePill}>
                            <Text style={st.recipePillText}>{item.prep_time} min</Text>
                          </View>
                          <View style={st.recipePill}>
                            <Text style={st.recipePillText}>{item.serving_size}</Text>
                          </View>
                        </View>
                        <Text style={st.recipeMacros}>
                          P:{item.protein}g · C:{item.carbs}g · F:{item.fats}g
                        </Text>
                      </View>
                      <View style={st.recipeAddBtn}>
                        <Plus size={18} color={S.dark} weight="bold" />
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: S.bg },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: F.bold,
    fontSize: 20,
    color: S.text,
    letterSpacing: -0.5,
  },

  /* Sections */
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: F.bold,
    fontSize: 20,
    color: S.text,
    letterSpacing: -0.5,
    marginBottom: 14,
  },

  /* Card */
  card: {
    backgroundColor: S.card,
    borderRadius: 24,
    padding: 20,
  },
  fieldLabel: {
    fontFamily: F.semi,
    fontSize: 12,
    color: S.dim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: F.medium,
    fontSize: 15,
    color: S.text,
  },

  /* Targets */
  targetRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  targetCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  targetLabel: {
    fontFamily: F.medium,
    fontSize: 12,
    color: S.dim,
  },
  targetInput: {
    fontFamily: F.bold,
    fontSize: 22,
    color: S.dark,
    textAlign: 'center',
    letterSpacing: -0.5,
    minWidth: 60,
  },
  targetUnit: {
    fontFamily: F.medium,
    fontSize: 12,
    color: S.dim,
    marginTop: -4,
  },

  /* Day tabs */
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F2F2F2',
    marginRight: 8,
    alignItems: 'center',
    minWidth: 50,
  },
  dayTabActive: {
    backgroundColor: S.dark,
  },
  dayTabText: {
    fontFamily: F.semi,
    fontSize: 13,
    color: S.dim,
  },
  dayTabTextActive: {
    color: '#FFF',
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: S.green,
    marginTop: 4,
  },

  /* Day card */
  dayCard: {
    borderRadius: 24,
    padding: 18,
  },
  dayHeader: {
    marginBottom: 14,
  },
  dayName: {
    fontFamily: F.bold,
    fontSize: 18,
    color: S.dark,
    letterSpacing: -0.4,
  },
  dayStats: {
    fontFamily: F.medium,
    fontSize: 12,
    color: S.dim,
    marginTop: 3,
  },

  /* Meal slots */
  mealSlot: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
  },
  mealSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealSlotIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealSlotTitle: {
    fontFamily: F.semi,
    fontSize: 14,
    color: S.text,
    flex: 1,
  },
  mealSlotAdd: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Assigned meals */
  assignedMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  assignedName: {
    fontFamily: F.semi,
    fontSize: 14,
    color: S.text,
    marginBottom: 2,
  },
  assignedMacros: {
    fontFamily: F.regular,
    fontSize: 12,
    color: S.dim,
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  portionBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  portionText: {
    fontFamily: F.semi,
    fontSize: 13,
    color: S.text,
    minWidth: 24,
    textAlign: 'center',
  },
  removeMealBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: S.red + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },

  /* Save button */
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: S.dark,
    borderRadius: 18,
    height: 56,
  },
  saveBtnText: {
    fontFamily: F.bold,
    fontSize: 17,
    color: '#FFF',
    letterSpacing: -0.2,
  },

  /* ── Modal ── */
  modalContainer: {
    flex: 1,
    backgroundColor: S.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  modalTitle: {
    fontFamily: F.bold,
    fontSize: 18,
    color: S.text,
    letterSpacing: -0.3,
  },
  modalSub: {
    fontFamily: F.medium,
    fontSize: 13,
    color: S.dim,
    marginTop: 1,
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 14,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: F.medium,
    fontSize: 15,
    color: S.text,
    paddingVertical: 13,
  },

  /* Category chips */
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F2F2F2',
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: S.dark,
  },
  catChipText: {
    fontFamily: F.semi,
    fontSize: 13,
    color: S.dim,
  },
  catChipTextActive: {
    color: '#FFF',
  },

  /* Recipe cards */
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
  },
  recipeName: {
    fontFamily: F.bold,
    fontSize: 16,
    color: S.dark,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  recipePillRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  recipePill: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recipePillText: {
    fontFamily: F.semi,
    fontSize: 11,
    color: S.dim,
  },
  recipeMacros: {
    fontFamily: F.medium,
    fontSize: 12,
    color: S.dim,
    marginTop: 2,
  },
  recipeAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});
