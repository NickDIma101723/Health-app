import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API
// Let op: Je moet EXPO_PUBLIC_GEMINI_API_KEY toevoegen in je .env bestand 
// voor productie/echt gebruik!
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "dummy_key";
const genAI = new GoogleGenerativeAI(apiKey);

/* ── Nutrition Calculator via Gemini AI ── */

export interface NutritionAPIResult {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  dailyCalories: number;
  protein: { min: number; max: number };
  carbs: { min: number; max: number };
  fat: { min: number; max: number };
  water: number;
}

export const calculateNutritionWithAI = async (params: {
  gender: 'male' | 'female';
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: string;
  activityMultiplier: number;
}): Promise<NutritionAPIResult> => {
  if (apiKey === "dummy_key" || !apiKey) {
    throw new Error("NO_API_KEY");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are a precise nutrition calculator. Calculate nutrition values for this person. Return ONLY a raw JSON object — no markdown, no code fences, no explanation.

Gender: ${params.gender}
Weight: ${params.weightKg} kg
Height: ${params.heightCm} cm
Age: ${params.age} years
Activity: ${params.activityLevel} (multiplier: ${params.activityMultiplier})

Calculate using these formulas:
1. BMI = weight_kg / (height_m ^ 2), round to 1 decimal
2. BMI category: <18.5 "Underweight", 18.5-24.9 "Normal", 25-29.9 "Overweight", >=30 "Obese"
3. BMR via Mifflin-St Jeor: Male = 10*kg + 6.25*cm - 5*age + 5, Female = 10*kg + 6.25*cm - 5*age - 161, round to integer
4. Daily calories = BMR * ${params.activityMultiplier}, round to integer
5. Protein: 1.8-2.2g per kg bodyweight, round to integer
6. Fat: 25-30% of daily calories / 9, round to integer
7. Carbs: remaining calories after average protein & fat / 4, with ±5% range, round to integer
8. Water: 35ml per kg / 1000, round to 1 decimal

Return exactly: {"bmi":0,"bmiCategory":"","bmr":0,"dailyCalories":0,"protein":{"min":0,"max":0},"carbs":{"min":0,"max":0},"fat":{"min":0,"max":0},"water":0}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse API response");

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate essential fields exist
  if (typeof parsed.bmi !== 'number' || typeof parsed.bmr !== 'number') {
    throw new Error("Invalid API response structure");
  }

  return parsed as NutritionAPIResult;
};

export const analyzeWorkoutWithGemini = async (stats: { 
  distance: string; 
  time: string; 
  calories: number; 
  pace: string; 
}) => {
  if (apiKey === "dummy_key" || !apiKey) {
    return "💡 Tip: Dit is een placeholder bericht. Voeg je 'EXPO_PUBLIC_GEMINI_API_KEY' toe in het .env bestand om je daadwerkelijke AI coach te activeren! Voor nu: Geweldig gewerkt, je tempo is super constant!";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Je bent een enthousiaste, moderne fitness coach voor een health app. 
    De gebruiker heeft zojuist een workout afgerond met deze statistieken:
    - Afstand: ${stats.distance} km
    - Tijd: ${stats.time}
    - Calorieën verbrand: ${stats.calories} kcal
    - Gemiddeld tempo: ${stats.pace} per kilometer.
    
    Geef ze een hele korte, punchy, motiverende reactie of tip van maximaal 2 zinnen in het Nederlands.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Wow, top resultaat! Ga zo door. (Kon server even niet bereiken).";
  }
};
