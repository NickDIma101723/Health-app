import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/database.types';

type HealthMetrics = Database['public']['Tables']['health_metrics']['Row'];
type HealthMetricsInsert = Database['public']['Tables']['health_metrics']['Insert'];
type HealthMetricsUpdate = Database['public']['Tables']['health_metrics']['Update'];

export const useHealthMetrics = (date?: string) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetDate = date || new Date().toISOString().split('T')[0];

  const fetchMetrics = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          const newMetrics: HealthMetricsInsert = {
            user_id: user.id,
            date: targetDate,
            steps: 0,
            calories_burned: 0,
            water_intake: 0,
            sleep_hours: 0,
            exercise_minutes: 0,
          };

          const { data: inserted, error: insertError } = await supabase
            .from('health_metrics')
            .insert(newMetrics)
            .select()
            .single();

          if (insertError) throw insertError;
          setMetrics(inserted);
        } else {
          throw fetchError;
        }
      } else {
        setMetrics(data);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch health metrics');
    } finally {
      setLoading(false);
    }
  };

  const updateMetrics = async (updates: Partial<HealthMetricsUpdate>) => {
    if (!user || !metrics) return { error: 'No metrics to update' };

    try {
      const { data, error: updateError } = await supabase
        .from('health_metrics')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', metrics.id)
        .select()
        .single();

      if (updateError) throw updateError;
      setMetrics(data);
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update metrics' };
    }
  };

  const incrementSteps = async (amount: number) => {
    if (!metrics) return;
    return updateMetrics({ steps: (metrics.steps || 0) + amount });
  };

  const incrementCalories = async (amount: number) => {
    if (!metrics) return;
    return updateMetrics({ calories_burned: (metrics.calories_burned || 0) + amount });
  };

  const incrementWater = async (amount: number) => {
    if (!metrics) return;
    return updateMetrics({ water_intake: (metrics.water_intake || 0) + amount });
  };

  const updateSleep = async (hours: number) => {
    return updateMetrics({ sleep_hours: hours });
  };

  const updateHeartRate = async (rate: number) => {
    return updateMetrics({ heart_rate: rate });
  };

  const incrementExercise = async (minutes: number) => {
    if (!metrics) return;
    return updateMetrics({ exercise_minutes: (metrics.exercise_minutes || 0) + minutes });
  };

  useEffect(() => {
    fetchMetrics();

    const channel = supabase
      .channel('health_metrics_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'health_metrics',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, targetDate]);

  return {
    metrics,
    loading,
    error,
    updateMetrics,
    incrementSteps,
    incrementCalories,
    incrementWater,
    updateSleep,
    updateHeartRate,
    incrementExercise,
    refresh: fetchMetrics,
  };
};
