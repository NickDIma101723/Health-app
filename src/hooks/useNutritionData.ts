import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/database.types';

type Meal = Database['public']['Tables']['meals']['Row'];
type MealInsert = Database['public']['Tables']['meals']['Insert'];
type MealUpdate = Database['public']['Tables']['meals']['Update'];
type WaterIntake = Database['public']['Tables']['water_intake']['Row'];
type WaterIntakeInsert = Database['public']['Tables']['water_intake']['Insert'];
type NutritionGoals = Database['public']['Tables']['nutrition_goals']['Row'];
type NutritionGoalsUpdate = Database['public']['Tables']['nutrition_goals']['Update'];

export const useNutritionData = () => {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterIntakes, setWaterIntakes] = useState<WaterIntake[]>([]);
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeals = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (fetchError) throw fetchError;
      
      setMeals(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching meals:', err);
      setError(err.message || 'Failed to fetch meals');
    }
  };

  const fetchWaterIntakes = async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('water_intake')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (fetchError) throw fetchError;
      
      setWaterIntakes(data || []);
    } catch (err: any) {
      console.error('Error fetching water intakes:', err);
    }
  };

  const fetchNutritionGoals = async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('nutrition_goals')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!data) {
        const defaultGoals = {
          user_id: user.id,
          calories: 2200,
          protein: 150,
          carbs: 250,
          fats: 70,
          water: 2000,
        };

        const { data: newGoals, error: insertError } = await supabase
          .from('nutrition_goals')
          .insert(defaultGoals)
          .select()
          .single();

        if (insertError) throw insertError;
        setNutritionGoals(newGoals);
      } else {
        setNutritionGoals(data);
      }
    } catch (err: any) {
      console.error('Error fetching nutrition goals:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await Promise.all([
        fetchMeals(),
        fetchWaterIntakes(),
        fetchNutritionGoals(),
      ]);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const mealsChannel = supabase
      .channel('meals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meals',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMeals(prev => [payload.new as Meal, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setMeals(prev =>
              prev.map(meal => (meal.id === payload.new.id ? payload.new as Meal : meal))
            );
          } else if (payload.eventType === 'DELETE') {
            setMeals(prev => prev.filter(meal => meal.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const waterChannel = supabase
      .channel('water_intake_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'water_intake',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setWaterIntakes(prev => [payload.new as WaterIntake, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setWaterIntakes(prev => prev.filter(intake => intake.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const goalsChannel = supabase
      .channel('nutrition_goals_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'nutrition_goals',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNutritionGoals(payload.new as NutritionGoals);
        }
      )
      .subscribe();

    return () => {
      mealsChannel.unsubscribe();
      waterChannel.unsubscribe();
      goalsChannel.unsubscribe();
    };
  }, [user]);

  const addMeal = async (meal: Omit<MealInsert, 'user_id'>) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data, error: insertError } = await supabase
        .from('meals')
        .insert({ ...meal, user_id: user.id })
        .select()
        .single();

      if (insertError) throw insertError;
      
      return { data, error: null };
    } catch (err: any) {
      console.error('Error adding meal:', err);
      return { data: null, error: err.message || 'Failed to add meal' };
    }
  };

  const updateMeal = async (id: string, updates: MealUpdate) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data, error: updateError } = await supabase
        .from('meals')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating meal:', err);
      return { data: null, error: err.message || 'Failed to update meal' };
    }
  };

  const deleteMeal = async (id: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error: deleteError } = await supabase
        .from('meals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting meal:', err);
      return { error: err.message || 'Failed to delete meal' };
    }
  };

  const addWaterIntake = async (waterIntake: Omit<WaterIntakeInsert, 'user_id'>) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data, error: insertError } = await supabase
        .from('water_intake')
        .insert({ ...waterIntake, user_id: user.id })
        .select()
        .single();

      if (insertError) throw insertError;
      
      return { data, error: null };
    } catch (err: any) {
      console.error('Error adding water intake:', err);
      return { data: null, error: err.message || 'Failed to add water intake' };
    }
  };

  const deleteWaterIntake = async (id: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error: deleteError } = await supabase
        .from('water_intake')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting water intake:', err);
      return { error: err.message || 'Failed to delete water intake' };
    }
  };

  const updateNutritionGoals = async (updates: Omit<NutritionGoalsUpdate, 'user_id'>) => {
    if (!user || !nutritionGoals) return { error: 'Not authenticated or no goals found' };

    try {
      const { data, error: updateError } = await supabase
        .from('nutrition_goals')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating nutrition goals:', err);
      return { data: null, error: err.message || 'Failed to update nutrition goals' };
    }
  };

  const getMealsForDate = (date: string): Meal[] => {
    return meals.filter(meal => meal.date === date);
  };

  const getWaterForDate = (date: string): WaterIntake[] => {
    return waterIntakes.filter(intake => intake.date === date);
  };

  const refetch = async () => {
    setLoading(true);
    await Promise.all([
      fetchMeals(),
      fetchWaterIntakes(),
      fetchNutritionGoals(),
    ]);
    setLoading(false);
  };

  return {
    meals,
    waterIntakes,
    nutritionGoals,
    loading,
    error,
    addMeal,
    updateMeal,
    deleteMeal,
    addWaterIntake,
    deleteWaterIntake,
    updateNutritionGoals,
    getMealsForDate,
    getWaterForDate,
    refetch,
  };
};
