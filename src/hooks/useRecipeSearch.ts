import { useState, useEffect, useCallback } from 'react';
import { Recipe } from '../data/recipes';

const SPOONACULAR_BASE = 'https://api.spoonacular.com';
const API_KEY = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY || '';

function guessMealType(dishTypes: string[]): Recipe['type'] {
  const types = dishTypes.map(t => t.toLowerCase());
  if (types.some(t => t.includes('breakfast') || t.includes('morning meal'))) return 'breakfast';
  if (types.some(t => t.includes('lunch') || t.includes('salad') || t.includes('soup'))) return 'lunch';
  if (types.some(t => t.includes('snack') || t.includes('appetizer') || t.includes('dessert') || t.includes('side dish'))) return 'snack';
  return 'dinner';
}

function guessDifficulty(readyInMinutes: number, ingredientCount: number): Recipe['difficulty'] {
  if (readyInMinutes <= 20 && ingredientCount <= 8) return 'easy';
  if (readyInMinutes > 60 || ingredientCount > 15) return 'hard';
  return 'medium';
}

function parseSpoonacularRecipe(item: any): Recipe {
  const nutrition = item.nutrition;
  const nutrients = nutrition?.nutrients || [];

  const findNutrient = (name: string) =>
    Math.round(nutrients.find((n: any) => n.name === name)?.amount || 0);

  const ingredients = (item.extendedIngredients || []).map(
    (ing: any) => ing.original || `${ing.amount} ${ing.unit} ${ing.name}`
  );

  const instructions = (item.analyzedInstructions?.[0]?.steps || []).map(
    (step: any) => step.step
  );

  return {
    id: `spoon-${item.id}`,
    name: item.title,
    description: item.summary
      ? item.summary.replace(/<[^>]+>/g, '').slice(0, 120)
      : `Ready in ${item.readyInMinutes} min`,
    type: guessMealType(item.dishTypes || []),
    calories: findNutrient('Calories'),
    protein: findNutrient('Protein'),
    carbs: findNutrient('Carbohydrates'),
    fats: findNutrient('Fat'),
    prepTime: Math.max(Math.round((item.readyInMinutes || 30) * 0.4), 5),
    cookTime: Math.max(Math.round((item.readyInMinutes || 30) * 0.6), 5),
    servings: item.servings || 2,
    difficulty: guessDifficulty(item.readyInMinutes || 30, ingredients.length),
    ingredients,
    instructions,
    tags: [
      ...(item.diets || []),
      ...(item.dishTypes || []),
      ...(item.cuisines || []),
    ].slice(0, 6),
    imageUrl: item.image,
    nutritionInfo: {
      fiber: findNutrient('Fiber'),
      sugar: findNutrient('Sugar'),
      sodium: findNutrient('Sodium'),
      cholesterol: findNutrient('Cholesterol'),
    },
  };
}

export function useRecipeSearch() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRandom();
  }, []);

  const buildUrl = (path: string, params: Record<string, string> = {}) => {
    const url = new URL(`${SPOONACULAR_BASE}${path}`);
    url.searchParams.set('apiKey', API_KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  };

  const fetchRandom = async () => {
    if (!API_KEY) return;
    setLoading(true);
    setError(null);
    try {
      const url = buildUrl('/recipes/random', {
        number: '6',
        addRecipeNutrition: 'true',
        addRecipeInstructions: 'true',
      });
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setRecipes((data.recipes || []).map(parseSpoonacularRecipe));
    } catch (e: any) {
      setError(e.message || 'Failed to fetch recipes');
    } finally {
      setLoading(false);
    }
  };

  const searchByName = useCallback(async (query: string) => {
    if (!query.trim() || !API_KEY) return;
    setLoading(true);
    setError(null);
    try {
      const url = buildUrl('/recipes/complexSearch', {
        query,
        number: '10',
        addRecipeNutrition: 'true',
        addRecipeInformation: 'true',
        fillIngredients: 'true',
        instructionsRequired: 'true',
      });
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setRecipes((data.results || []).map(parseSpoonacularRecipe));
    } catch (e: any) {
      setError(e.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchByDiet = useCallback(async (diet: string) => {
    if (!API_KEY) return;
    setLoading(true);
    setError(null);
    try {
      const url = buildUrl('/recipes/complexSearch', {
        diet,
        number: '8',
        addRecipeNutrition: 'true',
        addRecipeInformation: 'true',
        fillIngredients: 'true',
        sort: 'popularity',
      });
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setRecipes((data.results || []).map(parseSpoonacularRecipe));
    } catch (e: any) {
      setError(e.message || 'Diet search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchByNutrients = useCallback(async (maxCalories: number, minProtein?: number) => {
    if (!API_KEY) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        maxCalories: maxCalories.toString(),
        number: '8',
        addRecipeNutrition: 'true',
        addRecipeInformation: 'true',
        fillIngredients: 'true',
      };
      if (minProtein) params.minProtein = minProtein.toString();
      const url = buildUrl('/recipes/complexSearch', params);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setRecipes((data.results || []).map(parseSpoonacularRecipe));
    } catch (e: any) {
      setError(e.message || 'Nutrient search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    recipes,
    loading,
    error,
    fetchRandom,
    searchByName,
    searchByDiet,
    searchByNutrients,
  };
}
