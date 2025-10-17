import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';

interface NutritionCalculatorScreenProps {
  onNavigate?: (screen: string) => void;
}

type Gender = 'male' | 'female' | null;
type ActivityLevel = 
  | 'sedentary'      // 1.2
  | 'lightly'        // 1.375
  | 'somewhat'       // 1.465
  | 'moderately'     // 1.55
  | 'very'           // 1.725
  | 'extremely'      // 1.9
  | null;

interface CalculationResults {
  bmi: number;
  bmr: number;
  dailyCalories: number;
  carbs: { min: number; max: number };
  protein: { min: number; max: number };
  fat: { min: number; max: number };
  water: number;
}

export const NutritionCalculatorScreen: React.FC<NutritionCalculatorScreenProps> = ({ onNavigate }) => {
  const [gender, setGender] = useState<Gender>(null);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(null);
  const [results, setResults] = useState<CalculationResults | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const activityLevels = [
    { key: 'sedentary', label: 'Sedentary: Little or no exercise', multiplier: 1.2 },
    { key: 'lightly', label: 'Lightly Active: Exercise 1-3 times/week', multiplier: 1.375 },
    { key: 'somewhat', label: 'Somewhat Active: Exercise 4-5 times/week', multiplier: 1.465 },
    { key: 'moderately', label: 'Moderately Active: Daily exercise or intense 3-4x/week', multiplier: 1.55 },
    { key: 'very', label: 'Very Active: Intense exercise 6-7 times/week', multiplier: 1.725 },
    { key: 'extremely', label: 'Extremely Active: Very intense daily or physical job', multiplier: 1.9 },
  ];

  const calculateNutrition = () => {
    // Validation
    if (!gender) {
      Alert.alert('Missing Information', 'Please select your gender');
      return;
    }
    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid weight');
      return;
    }
    if (!height || parseFloat(height) <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid height');
      return;
    }
    if (!age || parseInt(age) <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid age');
      return;
    }
    if (!activityLevel) {
      Alert.alert('Missing Information', 'Please select your activity level');
      return;
    }

    const weightKg = parseFloat(weight);
    const heightM = parseFloat(height);
    const heightCm = heightM * 100;
    const ageYears = parseInt(age);

    // BMI Calculation
    // BMI = weight (kg) / (height in m * height in m)
    const bmi = weightKg / (heightM * heightM);

    // BMR Calculation
    // Men: 10 * weight + 6.25 * height(cm) - 5 * age + 5
    // Women: 10 * weight + 6.25 * height(cm) - 5 * age - 161
    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
    }

    // Daily Calorie Calculation
    const activityMultiplier = activityLevels.find(a => a.key === activityLevel)?.multiplier || 1.2;
    const dailyCalories = bmr * activityMultiplier;

    // Carbs Calculation (40-45% of calories, divide by 4 to get grams)
    const carbsMin = (dailyCalories * 0.40) / 4;
    const carbsMax = (dailyCalories * 0.45) / 4;

    // Protein Calculation (weight * 1.8-2.2)
    const proteinMin = weightKg * 1.8;
    const proteinMax = weightKg * 2.2;

    // Fat Calculation (20-25% of calories, divide by 9 to get grams)
    const fatMin = (dailyCalories * 0.20) / 9;
    const fatMax = (dailyCalories * 0.25) / 9;

    // Water Calculation (weight * 30 / 1000 to get liters)
    const water = (weightKg * 30) / 1000;

    setResults({
      bmi: parseFloat(bmi.toFixed(1)),
      bmr: Math.round(bmr),
      dailyCalories: Math.round(dailyCalories),
      carbs: { min: Math.round(carbsMin), max: Math.round(carbsMax) },
      protein: { min: Math.round(proteinMin), max: Math.round(proteinMax) },
      fat: { min: Math.round(fatMin), max: Math.round(fatMax) },
      water: parseFloat(water.toFixed(1)),
    });
  };

  const getBMICategory = (bmi: number): { label: string; color: string } => {
    if (bmi < 18.5) return { label: 'Underweight', color: colors.info };
    if (bmi < 25) return { label: 'Normal', color: colors.success };
    if (bmi < 30) return { label: 'Overweight', color: colors.warning };
    return { label: 'Obese', color: colors.error };
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate?.('nutrition')}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerSubtitle}>Personalized</Text>
          <Text style={styles.headerTitle}>Nutrition Calculator</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Gender Widget */}
          <View style={styles.widget}>
            <Text style={styles.widgetTitle}>Gender</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'male' && styles.genderButtonActive]}
                onPress={() => setGender('male')}
              >
                <MaterialIcons 
                  name="male" 
                  size={24} 
                  color={gender === 'male' ? colors.primary : colors.textSecondary} 
                />
                <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'female' && styles.genderButtonActive]}
                onPress={() => setGender('female')}
              >
                <MaterialIcons 
                  name="female" 
                  size={24} 
                  color={gender === 'female' ? colors.primary : colors.textSecondary} 
                />
                <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Body Metrics Widget */}
          <View style={styles.widget}>
            <Text style={styles.widgetTitle}>Body Metrics</Text>
            
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="Enter weight in kg"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textLight}
            />

            <Text style={styles.label}>Height (m)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              placeholder="Enter height in meters (e.g., 1.75)"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textLight}
            />

            <Text style={styles.label}>Age (years)</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="Enter your age"
              keyboardType="number-pad"
              placeholderTextColor={colors.textLight}
            />
          </View>

          {/* Activity Level Widget */}
          <View style={styles.widget}>
            <Text style={styles.widgetTitle}>Activity Level</Text>
            <View style={styles.activityContainer}>
              {activityLevels.map((level) => (
                <TouchableOpacity
                  key={level.key}
                  style={[
                    styles.activityButton,
                    activityLevel === level.key && styles.activityButtonActive,
                  ]}
                  onPress={() => setActivityLevel(level.key as ActivityLevel)}
                >
                  <Text
                    style={[
                      styles.activityText,
                      activityLevel === level.key && styles.activityTextActive,
                    ]}
                  >
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Calculate Button */}
          <TouchableOpacity style={styles.calculateButton} onPress={calculateNutrition}>
            <LinearGradient
              colors={[colors.primary, colors.primaryLight] as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.calculateGradient}
            >
              <MaterialIcons name="calculate" size={24} color="#fff" />
              <Text style={styles.calculateButtonText}>Calculate My Nutrition</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Results Section */}
        {results && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Your Results</Text>

            {/* BMI Card */}
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <MaterialIcons name="monitor-weight" size={28} color={colors.primary} />
                <Text style={styles.resultTitle}>Body Mass Index (BMI)</Text>
              </View>
              <View style={styles.resultValueContainer}>
                <Text style={styles.resultValue}>{results.bmi}</Text>
                <View 
                  style={[
                    styles.bmiCategory, 
                    { backgroundColor: getBMICategory(results.bmi).color + '20' }
                  ]}
                >
                  <Text style={[styles.bmiCategoryText, { color: getBMICategory(results.bmi).color }]}>
                    {getBMICategory(results.bmi).label}
                  </Text>
                </View>
              </View>
            </View>

            {/* BMR Card */}
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <MaterialIcons name="local-fire-department" size={28} color={colors.error} />
                <Text style={styles.resultTitle}>Basal Metabolic Rate (BMR)</Text>
              </View>
              <Text style={styles.resultValue}>{results.bmr} <Text style={styles.unit}>cal/day</Text></Text>
              <Text style={styles.resultDescription}>
                Calories burned at rest
              </Text>
            </View>

            {/* Daily Calories Card */}
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <MaterialIcons name="restaurant" size={28} color={colors.success} />
                <Text style={styles.resultTitle}>Daily Calorie Needs</Text>
              </View>
              <Text style={styles.resultValue}>{results.dailyCalories} <Text style={styles.unit}>cal/day</Text></Text>
              <Text style={styles.resultDescription}>
                Based on your activity level
              </Text>
            </View>

            {/* Macronutrients Section */}
            <Text style={styles.subsectionTitle}>Daily Macronutrients</Text>

            {/* Carbs Card */}
            <View style={styles.macroCard}>
              <View style={styles.macroHeader}>
                <MaterialIcons name="bakery-dining" size={24} color="#f59e0b" />
                <Text style={styles.macroTitle}>Carbohydrates</Text>
              </View>
              <Text style={styles.macroRange}>
                {results.carbs.min}-{results.carbs.max} <Text style={styles.unit}>g</Text>
              </Text>
              <Text style={styles.macroPercentage}>40-45% of daily calories</Text>
            </View>

            {/* Protein Card */}
            <View style={styles.macroCard}>
              <View style={styles.macroHeader}>
                <MaterialIcons name="egg" size={24} color="#ef4444" />
                <Text style={styles.macroTitle}>Protein</Text>
              </View>
              <Text style={styles.macroRange}>
                {results.protein.min}-{results.protein.max} <Text style={styles.unit}>g</Text>
              </Text>
              <Text style={styles.macroPercentage}>1.8-2.2g per kg body weight</Text>
            </View>

            {/* Fat Card */}
            <View style={styles.macroCard}>
              <View style={styles.macroHeader}>
                <MaterialIcons name="water-drop" size={24} color="#8b5cf6" />
                <Text style={styles.macroTitle}>Fats</Text>
              </View>
              <Text style={styles.macroRange}>
                {results.fat.min}-{results.fat.max} <Text style={styles.unit}>g</Text>
              </Text>
              <Text style={styles.macroPercentage}>20-25% of daily calories</Text>
            </View>

            {/* Water Card */}
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <MaterialIcons name="opacity" size={28} color={colors.info} />
                <Text style={styles.resultTitle}>Daily Water Intake</Text>
              </View>
              <Text style={styles.resultValue}>{results.water} <Text style={styles.unit}>L</Text></Text>
              <Text style={styles.resultDescription}>
                Recommended hydration goal
              </Text>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
        </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  formSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  widget: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  widgetTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  genderButtonActive: {
    backgroundColor: colors.primaryPale,
    borderColor: colors.primary,
  },
  genderText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  genderTextActive: {
    color: colors.primary,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  activityContainer: {
    gap: spacing.sm,
  },
  activityButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityButtonActive: {
    backgroundColor: colors.primaryPale,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  activityText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    lineHeight: 22,
  },
  activityTextActive: {
    color: colors.primary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  calculateButton: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  calculateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  calculateButtonText: {
    fontSize: fontSizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: '#fff',
  },
  resultsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  resultTitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  resultValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultValue: {
    fontSize: 42,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  unit: {
    fontSize: fontSizes.lg,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  resultDescription: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  bmiCategory: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  bmiCategoryText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
  },
  subsectionTitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  macroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  macroTitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  macroRange: {
    fontSize: fontSizes.xxl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginVertical: spacing.sm,
  },
  macroPercentage: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});
