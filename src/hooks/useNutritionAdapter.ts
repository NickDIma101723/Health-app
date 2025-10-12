import { useNutritionData } from './useNutritionData';
import {
  Meal as ContextMeal,
  WaterIntake as ContextWaterIntake,
  NutritionGoals as ContextGoals,
  DailyNutrition,
} from '../contexts/NutritionContext';
import { Database } from '../types/database.types';

type DBMeal = Database['public']['Tables']['meals']['Row'];
type DBWaterIntake = Database['public']['Tables']['water_intake']['Row'];
type DBNutritionGoals = Database['public']['Tables']['nutrition_goals']['Row'];

export const useNutritionAdapter = () => {
  const {
    meals: dbMeals,
    waterIntakes: dbWaterIntakes,
    nutritionGoals: dbGoals,
    loading,
    error,
    addMeal: dbAddMeal,
    updateMeal: dbUpdateMeal,
    deleteMeal: dbDeleteMeal,
    addWaterIntake: dbAddWaterIntake,
    deleteWaterIntake: dbDeleteWaterIntake,
    updateNutritionGoals: dbUpdateGoals,
    getMealsForDate: dbGetMealsForDate,
    getWaterForDate: dbGetWaterForDate,
    refetch,
  } = useNutritionData();

  const convertMeal = (dbMeal: DBMeal): ContextMeal => ({
    id: dbMeal.id,
    name: dbMeal.name,
    type: dbMeal.meal_type,
    calories: dbMeal.calories,
    protein: dbMeal.protein,
    carbs: dbMeal.carbs,
    fats: dbMeal.fats,
    time: dbMeal.time,
    date: dbMeal.date,
    imageUrl: dbMeal.image_url || undefined,
    ingredients: dbMeal.ingredients || undefined,
    notes: dbMeal.notes || undefined,
    createdAt: dbMeal.created_at,
    updatedAt: dbMeal.updated_at,
    userId: dbMeal.user_id,
  });

  const convertWaterIntake = (dbWater: DBWaterIntake): ContextWaterIntake => ({
    id: dbWater.id,
    amount: dbWater.amount,
    date: dbWater.date,
    time: dbWater.time,
    createdAt: dbWater.created_at,
    userId: dbWater.user_id,
  });

  const convertGoals = (dbGoals: DBNutritionGoals | null): ContextGoals => {
    if (!dbGoals) {
      return {
        calories: 2200,
        protein: 150,
        carbs: 250,
        fats: 70,
        water: 2000,
      };
    }

    return {
      calories: dbGoals.calories,
      protein: dbGoals.protein,
      carbs: dbGoals.carbs,
      fats: dbGoals.fats,
      water: dbGoals.water,
    };
  };

  const meals = dbMeals.map(convertMeal);
  const waterIntakes = dbWaterIntakes.map(convertWaterIntake);
  const goals = convertGoals(dbGoals);

  const getDailyNutrition = (date: string): DailyNutrition => {
    const dayMeals = meals.filter(meal => meal.date === date);
    const dayWater = waterIntakes.filter(intake => intake.date === date);

    const totals = dayMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fats: acc.fats + meal.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    const totalWater = dayWater.reduce((sum, intake) => sum + intake.amount, 0);

    return {
      date,
      ...totals,
      water: totalWater,
      meals: dayMeals,
      waterIntakes: dayWater,
    };
  };

  const addMeal = async (meal: Omit<ContextMeal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const insertData: any = {
      name: meal.name,
      meal_type: meal.type,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fats: meal.fats,
      time: meal.time,
      date: meal.date,
    };

    if (meal.imageUrl) insertData.image_url = meal.imageUrl;
    if (meal.ingredients) insertData.ingredients = meal.ingredients;
    if (meal.notes) insertData.notes = meal.notes;

    const result = await dbAddMeal(insertData);
    if (result.error) {
      console.error('Failed to add meal:', result.error);
    } else {
      await refetch();
    }
  };

  const updateMeal = async (id: string, updates: Partial<ContextMeal>) => {
    const dbUpdates: any = {};

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.meal_type = updates.type;
    if (updates.calories !== undefined) dbUpdates.calories = updates.calories;
    if (updates.protein !== undefined) dbUpdates.protein = updates.protein;
    if (updates.carbs !== undefined) dbUpdates.carbs = updates.carbs;
    if (updates.fats !== undefined) dbUpdates.fats = updates.fats;
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.ingredients !== undefined) dbUpdates.ingredients = updates.ingredients;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const result = await dbUpdateMeal(id, dbUpdates);
    if (result.error) {
      console.error('Failed to update meal:', result.error);
    } else {
      await refetch();
    }
  };

  const deleteMeal = async (id: string) => {
    const result = await dbDeleteMeal(id);
    if (result.error) {
      console.error('Failed to delete meal:', result.error);
    } else {
      await refetch();
    }
  };

  const addWaterIntake = async (amount: number) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const result = await dbAddWaterIntake({
      amount,
      date: today,
      time,
    });

    if (result.error) {
      console.error('Failed to add water intake:', result.error);
    } else {
      await refetch();
    }
  };

  const deleteWaterIntake = async (id: string) => {
    const result = await dbDeleteWaterIntake(id);
    if (result.error) {
      console.error('Failed to delete water intake:', result.error);
    } else {
      await refetch();
    }
  };

  const updateGoals = async (newGoals: Partial<ContextGoals>) => {
    const result = await dbUpdateGoals(newGoals);
    if (result.error) {
      console.error('Failed to update goals:', result.error);
    } else {
      await refetch();
    }
  };

  return {
    meals,
    waterIntakes,
    goals,
    loading,
    error,
    getDailyNutrition,
    addMeal,
    updateMeal,
    deleteMeal,
    addWaterIntake,
    deleteWaterIntake,
    updateGoals,
    refetch,
  };
};
