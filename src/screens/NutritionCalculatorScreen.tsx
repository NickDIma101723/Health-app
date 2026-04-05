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
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  GenderMale,
  GenderFemale,
  Barbell,
  Fire,
  Drop,
  Lightning,
  Scales,
  Calculator,
  Person,
  Warning,
  X,
  Heart,
  Sparkle,
} from 'phosphor-react-native';
import { calculateNutritionWithAI, NutritionAPIResult } from '../lib/gemini';

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

interface NutritionCalculatorScreenProps {
  onNavigate?: (screen: string) => void;
}

type Gender = 'male' | 'female' | null;
type ActivityLevel =
  | 'sedentary'
  | 'lightly'
  | 'somewhat'
  | 'moderately'
  | 'very'
  | 'extremely'
  | null;

interface CalculationResults {
  bmi: number;
  bmiCategory: string;
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
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
  }, []);

  const showError = (title: string, message: string) => {
    setErrorModal({ visible: true, title, message });
  };

  const hideError = () => {
    setErrorModal({ visible: false, title: '', message: '' });
  };

  const activityLevels = [
    { key: 'sedentary', label: 'Sedentary', sub: 'Little or no exercise', multiplier: 1.2 },
    { key: 'lightly', label: 'Lightly Active', sub: 'Exercise 1-3x/week', multiplier: 1.375 },
    { key: 'somewhat', label: 'Somewhat Active', sub: 'Exercise 4-5x/week', multiplier: 1.465 },
    { key: 'moderately', label: 'Moderately Active', sub: 'Daily or intense 3-4x/week', multiplier: 1.55 },
    { key: 'very', label: 'Very Active', sub: 'Intense 6-7x/week', multiplier: 1.725 },
    { key: 'extremely', label: 'Extremely Active', sub: 'Physical job + intense training', multiplier: 1.9 },
  ];

  const localCalculate = (weightKg: number, heightCm: number, ageYears: number, mult: number): CalculationResults => {
    const heightM = heightCm / 100;
    const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));
    let bmiCategory = 'Normal';
    if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi >= 25 && bmi < 30) bmiCategory = 'Overweight';
    else if (bmi >= 30) bmiCategory = 'Obese';

    const bmr = gender === 'male'
      ? Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5)
      : Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161);

    const dailyCalories = Math.round(bmr * mult);
    const proteinMin = Math.round(weightKg * 1.8);
    const proteinMax = Math.round(weightKg * 2.2);
    const fatMin = Math.round((dailyCalories * 0.25) / 9);
    const fatMax = Math.round((dailyCalories * 0.30) / 9);
    const proteinAvg = (proteinMin + proteinMax) / 2;
    const fatAvg = (fatMin + fatMax) / 2;
    const remaining = dailyCalories - proteinAvg * 4 - fatAvg * 9;
    const carbsMin = Math.round((remaining * 0.95) / 4);
    const carbsMax = Math.round((remaining * 1.05) / 4);
    const water = parseFloat(((weightKg * 35) / 1000).toFixed(1));

    return { bmi, bmiCategory, bmr, dailyCalories, protein: { min: proteinMin, max: proteinMax }, carbs: { min: carbsMin, max: carbsMax }, fat: { min: fatMin, max: fatMax }, water };
  };

  const calculateNutrition = async () => {
    if (!gender) { showError('Missing Information', 'Please select your gender'); return; }
    if (!weight || parseFloat(weight) <= 0) { showError('Invalid Input', 'Please enter a valid weight'); return; }
    if (!height || parseFloat(height) <= 0) { showError('Invalid Input', 'Please enter a valid height'); return; }
    if (!age || parseInt(age) <= 0) { showError('Invalid Input', 'Please enter a valid age'); return; }
    if (!activityLevel) { showError('Missing Information', 'Please select your activity level'); return; }

    const weightKg = weightUnit === 'kg' ? parseFloat(weight) : parseFloat(weight) * 0.453592;
    const heightM = heightUnit === 'm' ? parseFloat(height) : parseFloat(height) * 0.3048;
    const heightCm = heightM * 100;
    const ageYears = parseInt(age);

    if (weightKg < 20 || weightKg > 300) { showError('Invalid Input', 'Please enter a realistic weight'); return; }
    if (heightM < 0.5 || heightM > 3.0) { showError('Invalid Input', 'Please enter a realistic height'); return; }
    if (ageYears < 10 || ageYears > 120) { showError('Invalid Input', 'Please enter a realistic age (10-120)'); return; }

    const mult = activityLevels.find(a => a.key === activityLevel)?.multiplier || 1.2;

    setLoading(true);

    try {
      const apiResult: NutritionAPIResult = await calculateNutritionWithAI({
        gender,
        weightKg,
        heightCm,
        age: ageYears,
        activityLevel,
        activityMultiplier: mult,
      });

      setResults({
        bmi: apiResult.bmi,
        bmiCategory: apiResult.bmiCategory,
        bmr: apiResult.bmr,
        dailyCalories: apiResult.dailyCalories,
        carbs: apiResult.carbs,
        protein: apiResult.protein,
        fat: apiResult.fat,
        water: apiResult.water,
      });
    } catch (err: any) {
      // Fallback to local calculation when API is unavailable
      const local = localCalculate(weightKg, heightCm, ageYears, mult);
      setResults(local);
    } finally {
      setLoading(false);
    }
  };

  const getBMICategoryStyle = (cat: string): { color: string; bg: string } => {
    switch (cat) {
      case 'Underweight': return { color: S.blue, bg: S.blue + '15' };
      case 'Normal': return { color: S.green, bg: S.green + '15' };
      case 'Overweight': return { color: S.amber, bg: S.amber + '15' };
      case 'Obese': return { color: S.red, bg: S.red + '15' };
      default: return { color: S.dim, bg: '#F2F2F2' };
    }
  };

  return (
    <View style={st.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity style={st.backBtn} onPress={() => onNavigate?.('nutrition')}>
            <ArrowLeft size={20} color={S.dark} weight="bold" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Nutrition Calculator</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Gender */}
            <View style={st.section}>
              <Text style={st.sectionTitle}>Gender</Text>
              <View style={st.genderRow}>
                <TouchableOpacity
                  style={[st.genderBtn, gender === 'male' && st.genderBtnActive]}
                  onPress={() => setGender('male')}
                >
                  <View style={[st.genderIcon, { backgroundColor: gender === 'male' ? S.blue + '15' : '#F2F2F2' }]}>
                    <GenderMale size={24} color={gender === 'male' ? S.blue : S.dim} weight="bold" />
                  </View>
                  <Text style={[st.genderText, gender === 'male' && { color: S.blue }]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.genderBtn, gender === 'female' && { ...st.genderBtnActive, borderColor: '#EC4899' }]}
                  onPress={() => setGender('female')}
                >
                  <View style={[st.genderIcon, { backgroundColor: gender === 'female' ? '#EC489915' : '#F2F2F2' }]}>
                    <GenderFemale size={24} color={gender === 'female' ? '#EC4899' : S.dim} weight="bold" />
                  </View>
                  <Text style={[st.genderText, gender === 'female' && { color: '#EC4899' }]}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Body Metrics */}
            <View style={st.section}>
              <Text style={st.sectionTitle}>Body Metrics</Text>
              <View style={st.card}>
                {/* Weight */}
                <View style={st.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.fieldLabel}>Weight</Text>
                    <TextInput
                      style={st.input}
                      value={weight}
                      onChangeText={setWeight}
                      placeholder={weightUnit === 'kg' ? '70' : '154'}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#CCC"
                    />
                  </View>
                  <View style={st.unitGroup}>
                    <TouchableOpacity
                      style={[st.unitBtn, weightUnit === 'kg' && st.unitBtnActive]}
                      onPress={() => setWeightUnit('kg')}
                    >
                      <Text style={[st.unitText, weightUnit === 'kg' && st.unitTextActive]}>kg</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[st.unitBtn, weightUnit === 'lbs' && st.unitBtnActive]}
                      onPress={() => setWeightUnit('lbs')}
                    >
                      <Text style={[st.unitText, weightUnit === 'lbs' && st.unitTextActive]}>lbs</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={st.fieldDivider} />

                {/* Height */}
                <View style={st.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.fieldLabel}>Height</Text>
                    <TextInput
                      style={st.input}
                      value={height}
                      onChangeText={setHeight}
                      placeholder={heightUnit === 'm' ? '1.75' : '5.75'}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#CCC"
                    />
                  </View>
                  <View style={st.unitGroup}>
                    <TouchableOpacity
                      style={[st.unitBtn, heightUnit === 'm' && st.unitBtnActive]}
                      onPress={() => setHeightUnit('m')}
                    >
                      <Text style={[st.unitText, heightUnit === 'm' && st.unitTextActive]}>m</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[st.unitBtn, heightUnit === 'ft' && st.unitBtnActive]}
                      onPress={() => setHeightUnit('ft')}
                    >
                      <Text style={[st.unitText, heightUnit === 'ft' && st.unitTextActive]}>ft</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={st.fieldDivider} />

                {/* Age */}
                <View>
                  <Text style={st.fieldLabel}>Age</Text>
                  <TextInput
                    style={st.input}
                    value={age}
                    onChangeText={setAge}
                    placeholder="25"
                    keyboardType="number-pad"
                    placeholderTextColor="#CCC"
                  />
                </View>
              </View>
            </View>

            {/* Activity Level */}
            <View style={st.section}>
              <Text style={st.sectionTitle}>Activity Level</Text>
              <View style={{ gap: 8 }}>
                {activityLevels.map((level) => (
                  <TouchableOpacity
                    key={level.key}
                    style={[st.activityBtn, activityLevel === level.key && st.activityBtnActive]}
                    onPress={() => setActivityLevel(level.key as ActivityLevel)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[st.activityLabel, activityLevel === level.key && { color: S.dark }]}>
                        {level.label}
                      </Text>
                      <Text style={st.activitySub}>{level.sub}</Text>
                    </View>
                    {activityLevel === level.key && (
                      <View style={st.activityCheck}>
                        <View style={st.activityCheckInner} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Calculate Button */}
            <View style={{ paddingHorizontal: 20, marginTop: 8, marginBottom: 32 }}>
              <TouchableOpacity style={st.calcBtn} onPress={calculateNutrition} activeOpacity={0.85} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Sparkle size={20} color="#FFF" weight="fill" />
                    <Text style={st.calcBtnText}>Calculate with AI</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Results */}
            {results && (
              <View style={st.resultsSection}>
                <Text style={st.resultsSectionTitle}>Your Results</Text>

                {/* BMI + BMR row */}
                <View style={st.resultRow}>
                  <View style={[st.resultCard, { backgroundColor: '#F0F7E6' }]}>
                    <View style={st.resultIconWrap}>
                      <Scales size={20} color={S.green} weight="fill" />
                    </View>
                    <Text style={st.resultLabel}>BMI</Text>
                    <Text style={st.resultValue}>{results.bmi}</Text>
                    <View style={[st.bmiPill, { backgroundColor: getBMICategoryStyle(results.bmiCategory).bg }]}>
                      <Text style={[st.bmiPillText, { color: getBMICategoryStyle(results.bmiCategory).color }]}>
                        {results.bmiCategory}
                      </Text>
                    </View>
                  </View>
                  <View style={[st.resultCard, { backgroundColor: '#FEF4E8' }]}>
                    <View style={st.resultIconWrap}>
                      <Fire size={20} color={S.amber} weight="fill" />
                    </View>
                    <Text style={st.resultLabel}>BMR</Text>
                    <Text style={st.resultValue}>{results.bmr}</Text>
                    <Text style={st.resultUnit}>cal/day</Text>
                  </View>
                </View>

                {/* Daily Calories — hero card */}
                <View style={st.calorieHero}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Fire size={22} color={S.green} weight="fill" />
                    <Text style={st.calorieHeroLabel}>Daily Calorie Needs</Text>
                  </View>
                  <Text style={st.calorieHeroVal}>{results.dailyCalories}</Text>
                  <Text style={st.calorieHeroUnit}>calories / day</Text>
                </View>

                {/* Macro boxes with borders */}
                <Text style={st.macroSectionTitle}>Daily Macronutrients</Text>
                <View style={st.macroRow}>
                  <View style={st.macroBox}>
                    <Text style={st.macroLabel}>protein</Text>
                    <Text style={st.macroVal}>{results.protein.min}-{results.protein.max}g</Text>
                  </View>
                  <View style={st.macroBox}>
                    <Text style={st.macroLabel}>carbs</Text>
                    <Text style={st.macroVal}>{results.carbs.min}-{results.carbs.max}g</Text>
                  </View>
                  <View style={[st.macroBox, { borderRightWidth: 1.5 }]}>
                    <Text style={st.macroLabel}>fat</Text>
                    <Text style={st.macroVal}>{results.fat.min}-{results.fat.max}g</Text>
                  </View>
                </View>

                {/* Water */}
                <View style={st.waterCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[st.resultIconWrap, { backgroundColor: S.teal + '15' }]}>
                      <Drop size={20} color={S.teal} weight="fill" />
                    </View>
                    <View>
                      <Text style={st.waterLabel}>Daily Water Intake</Text>
                      <Text style={st.waterSub}>35ml per kg body weight</Text>
                    </View>
                  </View>
                  <Text style={st.waterVal}>{results.water}L</Text>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Error Modal */}
        <Modal visible={errorModal.visible} transparent animationType="fade" onRequestClose={hideError}>
          <View style={st.errorOverlay}>
            <View style={st.errorCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <View style={[st.resultIconWrap, { backgroundColor: S.red + '15' }]}>
                  <Warning size={22} color={S.red} weight="fill" />
                </View>
                <Text style={st.errorTitle}>{errorModal.title}</Text>
              </View>
              <Text style={st.errorMsg}>{errorModal.message}</Text>
              <TouchableOpacity style={st.errorBtn} onPress={hideError} activeOpacity={0.85}>
                <Text style={st.errorBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
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
    fontSize: 18,
    color: S.text,
    letterSpacing: -0.4,
    marginBottom: 12,
  },

  /* Gender */
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: S.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: S.border,
  },
  genderBtnActive: { borderColor: S.blue },
  genderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderText: {
    fontFamily: F.semi,
    fontSize: 15,
    color: S.dim,
  },

  /* Body Metrics Card */
  card: {
    backgroundColor: S.card,
    borderRadius: 24,
    padding: 20,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
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
    fontSize: 16,
    color: S.text,
  },
  fieldDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  unitGroup: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  unitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F2F2F2',
  },
  unitBtnActive: { backgroundColor: S.dark },
  unitText: { fontFamily: F.semi, fontSize: 13, color: S.dim },
  unitTextActive: { color: '#FFF' },

  /* Activity */
  activityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: S.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activityBtnActive: {
    borderColor: S.dark,
    backgroundColor: S.lime + '20',
  },
  activityLabel: {
    fontFamily: F.semi,
    fontSize: 14,
    color: S.dim,
    marginBottom: 2,
  },
  activitySub: {
    fontFamily: F.regular,
    fontSize: 12,
    color: S.dim,
  },
  activityCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: S.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityCheckInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: S.lime,
  },

  /* Calculate button */
  calcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: S.dark,
    borderRadius: 18,
    height: 56,
  },
  calcBtnText: {
    fontFamily: F.bold,
    fontSize: 17,
    color: '#FFF',
    letterSpacing: -0.2,
  },

  /* Results */
  resultsSection: {
    paddingHorizontal: 20,
  },
  resultsSectionTitle: {
    fontFamily: F.bold,
    fontSize: 22,
    color: S.text,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  resultRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  resultCard: {
    flex: 1,
    borderRadius: 22,
    padding: 18,
    alignItems: 'flex-start',
  },
  resultIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultLabel: {
    fontFamily: F.medium,
    fontSize: 13,
    color: S.dim,
    marginBottom: 4,
  },
  resultValue: {
    fontFamily: F.bold,
    fontSize: 32,
    color: S.dark,
    letterSpacing: -1,
    lineHeight: 36,
    marginBottom: 4,
  },
  resultUnit: {
    fontFamily: F.medium,
    fontSize: 12,
    color: S.dim,
  },
  bmiPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  bmiPillText: {
    fontFamily: F.semi,
    fontSize: 12,
  },

  /* Calorie hero */
  calorieHero: {
    backgroundColor: '#E8F5E9',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  calorieHeroLabel: {
    fontFamily: F.semi,
    fontSize: 14,
    color: '#333',
  },
  calorieHeroVal: {
    fontFamily: F.bold,
    fontSize: 52,
    color: S.dark,
    letterSpacing: -2,
    lineHeight: 56,
  },
  calorieHeroUnit: {
    fontFamily: F.medium,
    fontSize: 14,
    color: S.dim,
    marginTop: 2,
  },

  /* Macro boxes */
  macroSectionTitle: {
    fontFamily: F.bold,
    fontSize: 18,
    color: S.text,
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  macroRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  macroBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: S.dark,
    borderRightWidth: 0,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  macroLabel: {
    fontFamily: F.medium,
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  macroVal: {
    fontFamily: F.bold,
    fontSize: 18,
    color: S.dark,
    letterSpacing: -0.3,
  },

  /* Water */
  waterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: S.card,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
  },
  waterLabel: {
    fontFamily: F.semi,
    fontSize: 15,
    color: S.text,
  },
  waterSub: {
    fontFamily: F.regular,
    fontSize: 12,
    color: S.dim,
    marginTop: 2,
  },
  waterVal: {
    fontFamily: F.bold,
    fontSize: 28,
    color: S.teal,
    letterSpacing: -0.8,
  },

  /* Error Modal */
  errorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  errorTitle: {
    fontFamily: F.bold,
    fontSize: 18,
    color: S.text,
    letterSpacing: -0.3,
    flex: 1,
  },
  errorMsg: {
    fontFamily: F.regular,
    fontSize: 14,
    color: '#555',
    lineHeight: 21,
    marginBottom: 20,
  },
  errorBtn: {
    backgroundColor: S.dark,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  errorBtnText: {
    fontFamily: F.bold,
    fontSize: 15,
    color: '#FFF',
  },
});
