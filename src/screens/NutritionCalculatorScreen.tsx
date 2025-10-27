import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
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
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<'m' | 'ft'>('m');
  const [age, setAge] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(null);
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const showError = (title: string, message: string) => {
    setErrorModal({ visible: true, title, message });
  };

  const hideError = () => {
    setErrorModal({ visible: false, title: '', message: '' });
  };

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
      showError('Missing Information', 'Please select your gender');
      return;
    }
    if (!weight || parseFloat(weight) <= 0) {
      showError('Invalid Input', 'Please enter a valid weight');
      return;
    }
    if (!height || parseFloat(height) <= 0) {
      showError('Invalid Input', 'Please enter a valid height');
      return;
    }
    if (!age || parseInt(age) <= 0) {
      showError('Invalid Input', 'Please enter a valid age');
      return;
    }
    if (!activityLevel) {
      showError('Missing Information', 'Please select your activity level');
      return;
    }

    // Convert to metric
    const weightKg = weightUnit === 'kg' ? parseFloat(weight) : parseFloat(weight) * 0.453592; // lbs to kg
    const heightM = heightUnit === 'm' ? parseFloat(height) : parseFloat(height) * 0.3048; // ft to m
    const heightCm = heightM * 100;
    const ageYears = parseInt(age);

    // Sanity checks - realistic human ranges
    if (weightUnit === 'kg') {
      if (weightKg < 20 || weightKg > 300) {
        showError('Invalid Input', 'Please enter a realistic weight between 20-300 kg');
        return;
      }
    } else {
      if (weightKg < 44 || weightKg > 661) { // 20-300 kg converted to lbs
        showError('Invalid Input', 'Please enter a realistic weight between 44-661 lbs');
        return;
      }
    }
    
    if (heightUnit === 'm') {
      if (heightM < 0.5 || heightM > 3.0) {
        showError('Invalid Input', 'Please enter height in meters (e.g., 1.75 for 175cm).\nValid range: 0.5m - 3.0m');
        return;
      }
    } else {
      if (heightM < 1.64 || heightM > 9.84) { // 0.5-3.0m converted to ft
        showError('Invalid Input', 'Please enter height in feet (e.g., 5.75 for 5\'9").\nValid range: 1.6-9.8 ft');
        return;
      }
    }
    
    if (ageYears < 10 || ageYears > 120) {
      showError('Invalid Input', 'Please enter a realistic age between 10-120 years');
      return;
    }

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
    const dailyCalories = Math.round(bmr * activityMultiplier);

    // Protein Calculation (1.8-2.2g per kg bodyweight for active individuals)
    const proteinMin = weightKg * 1.8;
    const proteinMax = weightKg * 2.2;
    const proteinAvg = (proteinMin + proteinMax) / 2;

    // Fat Calculation (25-30% of daily calories, fat has 9 cal/g)
    const fatMin = (dailyCalories * 0.25) / 9;
    const fatMax = (dailyCalories * 0.30) / 9;
    const fatAvg = (fatMin + fatMax) / 2;

    // Carbs Calculation (remaining calories after protein and fat)
    // Using average protein and fat to calculate remaining calories
    const proteinCalories = proteinAvg * 4; // protein has 4 cal/g
    const fatCalories = fatAvg * 9; // fat has 9 cal/g
    const remainingCalories = dailyCalories - proteinCalories - fatCalories;
    
    // Carbs have 4 calories per gram
    const carbsMin = (remainingCalories * 0.95) / 4; // 95% of remaining
    const carbsMax = (remainingCalories * 1.05) / 4; // 105% of remaining

    // Water Calculation (weight * 35ml per kg, converted to liters)
    const water = (weightKg * 35) / 1000;

    setResults({
      bmi: parseFloat(bmi.toFixed(1)),
      bmr: Math.round(bmr),
      dailyCalories: dailyCalories,
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
            
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Weight</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder={weightUnit === 'kg' ? 'e.g., 70' : 'e.g., 154'}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.helperText}>
                  {weightUnit === 'kg' ? '20-300 kg' : '44-661 lbs'}
                </Text>
              </View>
              <View style={styles.unitSelector}>
                <TouchableOpacity
                  style={[styles.unitButton, weightUnit === 'kg' && styles.unitButtonActive]}
                  onPress={() => setWeightUnit('kg')}
                >
                  <Text style={[styles.unitButtonText, weightUnit === 'kg' && styles.unitButtonTextActive]}>
                    kg
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, weightUnit === 'lbs' && styles.unitButtonActive]}
                  onPress={() => setWeightUnit('lbs')}
                >
                  <Text style={[styles.unitButtonText, weightUnit === 'lbs' && styles.unitButtonTextActive]}>
                    lbs
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Height</Text>
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder={heightUnit === 'm' ? 'e.g., 1.75' : 'e.g., 5.75'}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.helperText}>
                  {heightUnit === 'm' ? '0.5-3.0 m' : '1.6-9.8 ft'}
                </Text>
              </View>
              <View style={styles.unitSelector}>
                <TouchableOpacity
                  style={[styles.unitButton, heightUnit === 'm' && styles.unitButtonActive]}
                  onPress={() => setHeightUnit('m')}
                >
                  <Text style={[styles.unitButtonText, heightUnit === 'm' && styles.unitButtonTextActive]}>
                    m
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, heightUnit === 'ft' && styles.unitButtonActive]}
                  onPress={() => setHeightUnit('ft')}
                >
                  <Text style={[styles.unitButtonText, heightUnit === 'ft' && styles.unitButtonTextActive]}>
                    ft
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.label}>Age (years)</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="e.g., 25"
              keyboardType="number-pad"
              placeholderTextColor={colors.textLight}
            />
            <Text style={styles.helperText}>Enter your age in years (10-120)</Text>
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
              <Text style={styles.macroPercentage}>Remaining calories after protein & fat</Text>
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
              <Text style={styles.macroPercentage}>25-30% of daily calories</Text>
            </View>

            {/* Water Card */}
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <MaterialIcons name="opacity" size={28} color={colors.info} />
                <Text style={styles.resultTitle}>Daily Water Intake</Text>
              </View>
              <Text style={styles.resultValue}>{results.water} <Text style={styles.unit}>L</Text></Text>
              <Text style={styles.resultDescription}>
                35ml per kg body weight
              </Text>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
        </Animated.View>
      </ScrollView>

      {/* Error Modal */}
      <Modal
        visible={errorModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideError}
      >
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModalContent}>
            <View style={styles.errorModalHeader}>
              <MaterialIcons name="error-outline" size={32} color={colors.error} />
              <Text style={styles.errorModalTitle}>{errorModal.title}</Text>
            </View>
            <Text style={styles.errorModalMessage}>{errorModal.message}</Text>
            <TouchableOpacity style={styles.errorModalButton} onPress={hideError}>
              <Text style={styles.errorModalButtonText}>OK</Text>
            </TouchableOpacity>
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
  helperText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textLight,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flex: 1,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 28,
  },
  unitButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 50,
    alignItems: 'center',
  },
  unitButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unitButtonText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  unitButtonTextActive: {
    color: colors.textLight,
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
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  errorModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  errorModalTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    flex: 1,
  },
  errorModalMessage: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  errorModalButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  errorModalButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textLight,
  },
});
