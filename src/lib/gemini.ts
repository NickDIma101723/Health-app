import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API
// Let op: Je moet EXPO_PUBLIC_GEMINI_API_KEY toevoegen in je .env bestand 
// voor productie/echt gebruik!
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "dummy_key";
const genAI = new GoogleGenerativeAI(apiKey);

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
