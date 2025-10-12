import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/database.types';

type UserGoals = Database['public']['Tables']['user_goals']['Row'];
type UserGoalsUpdate = Database['public']['Tables']['user_goals']['Update'];

export const useUserGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          const defaultGoals = {
            user_id: user.id,
            steps_daily: 10000,
            calories_daily: 2200,
            protein_daily: 165,
            carbs_daily: 220,
            fats_daily: 73,
            water_daily: 8,
            sleep_hours_daily: 8,
            exercise_minutes_daily: 30,
          };

          const { data: inserted, error: insertError } = await supabase
            .from('user_goals')
            .insert(defaultGoals)
            .select()
            .single();

          if (insertError) throw insertError;
          setGoals(inserted);
        } else {
          throw fetchError;
        }
      } else {
        setGoals(data);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };

  const updateGoals = async (updates: Partial<UserGoalsUpdate>) => {
    if (!user || !goals) return { error: 'No goals to update' };

    try {
      const { data, error: updateError } = await supabase
        .from('user_goals')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', goals.id)
        .select()
        .single();

      if (updateError) throw updateError;
      setGoals(data);
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update goals' };
    }
  };

  useEffect(() => {
    fetchGoals();

    const channel = supabase
      .channel('user_goals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_goals',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchGoals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    goals,
    loading,
    error,
    updateGoals,
    refresh: fetchGoals,
  };
};
