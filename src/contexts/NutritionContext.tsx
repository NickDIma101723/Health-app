import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  time: string;
  date: string;
  imageUrl?: string;
  ingredients?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface WaterIntake {
  id: string;
  amount: number;
  date: string;
  time: string;
  createdAt: string;
  userId?: string;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water: number;
}

export interface DailyNutrition {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water: number;
  meals: Meal[];
  waterIntakes: WaterIntake[];
}

interface NutritionContextType {
  meals: Meal[];
  waterIntakes: WaterIntake[];
  goals: NutritionGoals;
  getDailyNutrition: (date: string) => DailyNutrition;
  addMeal: (meal: Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMeal: (id: string, updates: Partial<Meal>) => void;
  deleteMeal: (id: string) => void;
  addWaterIntake: (amount: number) => void;
  deleteWaterIntake: (id: string) => void;
  updateGoals: (goals: Partial<NutritionGoals>) => void;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

const defaultGoals: NutritionGoals = {
  calories: 2200,
  protein: 150,
  carbs: 250,
  fats: 70,
  water: 8,
};

const getInitialMeals = (): Meal[] => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  return [
    {
      id: '1',
      name: 'Avocado Toast & Eggs',
      type: 'breakfast',
      calories: 420,
      protein: 18,
      carbs: 35,
      fats: 24,
      time: '08:00',
      date: today,
      ingredients: ['Whole grain bread', 'Avocado', 'Eggs', 'Cherry tomatoes'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '2',
      name: 'Greek Yogurt & Berries',
      type: 'snack',
      calories: 180,
      protein: 15,
      carbs: 22,
      fats: 4,
      time: '10:30',
      date: today,
      ingredients: ['Greek yogurt', 'Mixed berries', 'Honey', 'Granola'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '3',
      name: 'Grilled Chicken Salad',
      type: 'lunch',
      calories: 450,
      protein: 42,
      carbs: 28,
      fats: 18,
      time: '13:00',
      date: today,
      ingredients: ['Grilled chicken', 'Mixed greens', 'Quinoa', 'Olive oil dressing'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '4',
      name: 'Protein Smoothie',
      type: 'snack',
      calories: 280,
      protein: 25,
      carbs: 35,
      fats: 6,
      time: '16:00',
      date: today,
      ingredients: ['Protein powder', 'Banana', 'Almond milk', 'Peanut butter'],
      createdAt: now,
      updatedAt: now,
    },
  ];
};

const getInitialWaterIntakes = (): WaterIntake[] => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  return [
    { id: '1', amount: 250, date: today, time: '08:00', createdAt: now },
    { id: '2', amount: 500, date: today, time: '10:00', createdAt: now },
    { id: '3', amount: 350, date: today, time: '12:00', createdAt: now },
    { id: '4', amount: 250, date: today, time: '14:00', createdAt: now },
    { id: '5', amount: 400, date: today, time: '16:00', createdAt: now },
  ];
};

export const NutritionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [meals, setMeals] = useState<Meal[]>(getInitialMeals());
  const [waterIntakes, setWaterIntakes] = useState<WaterIntake[]>(getInitialWaterIntakes());
  const [goals, setGoals] = useState<NutritionGoals>(defaultGoals);

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

    const totalWater = dayWater.reduce((sum, intake) => sum + intake.amount, 0) / 1000;

    return {
      date,
      ...totals,
      water: totalWater,
      meals: dayMeals,
      waterIntakes: dayWater,
    };
  };

  const addMeal = (meal: Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newMeal: Meal = {
      ...meal,
      id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };
    setMeals(prev => [...prev, newMeal]);
  };

  const updateMeal = (id: string, updates: Partial<Meal>) => {
    setMeals(prev =>
      prev.map(meal =>
        meal.id === id
          ? { ...meal, ...updates, updatedAt: new Date().toISOString() }
          : meal
      )
    );
  };

  const deleteMeal = (id: string) => {
    setMeals(prev => prev.filter(meal => meal.id !== id));
  };

  const addWaterIntake = (amount: number) => {
    const now = new Date();
    const newIntake: WaterIntake = {
      id: `water-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      createdAt: now.toISOString(),
    };
    setWaterIntakes(prev => [...prev, newIntake]);
  };

  const deleteWaterIntake = (id: string) => {
    setWaterIntakes(prev => prev.filter(intake => intake.id !== id));
  };

  const updateGoals = (newGoals: Partial<NutritionGoals>) => {
    setGoals(prev => ({ ...prev, ...newGoals }));
  };

  const value: NutritionContextType = {
    meals,
    waterIntakes,
    goals,
    getDailyNutrition,
    addMeal,
    updateMeal,
    deleteMeal,
    addWaterIntake,
    deleteWaterIntake,
    updateGoals,
  };

  return <NutritionContext.Provider value={value}>{children}</NutritionContext.Provider>;
};

export const useNutrition = (): NutritionContextType => {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
};
