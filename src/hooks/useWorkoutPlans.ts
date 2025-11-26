import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface WorkoutPlan {
  id: string;
  coach_id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  workout_days: WorkoutDay[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface WorkoutDay {
  id: string;
  name: string;
  description: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutExercise {
  exercise: Exercise;
  sets: number;
  reps: string;
  rest_seconds?: number;
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  instructions: string;
  equipment_needed?: string;
}

export const useWorkoutPlans = () => {
  const { user, coachData } = useAuth();
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const fetchWorkoutPlans = async (clientId?: string) => {
    if (isFetching) return;

    try {
      setIsFetching(true);
      setLoading(true);

      let query = supabase
        .from('workout_plans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (coachData) {
        
        query = query.eq('coach_id', coachData.id);
        if (clientId) {
          query = query.eq('client_id', clientId);
        }
      } else if (user) {
        
        query = query.eq('client_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          console.log('Workout plans table not found, returning empty array');
          setWorkoutPlans([]);
          return;
        }
        throw error;
      }
      
      setWorkoutPlans(data || []);
    } catch (error) {
      console.error('Error fetching workout plans:', error);
      setWorkoutPlans([]);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const createWorkoutPlan = async (planData: Omit<WorkoutPlan, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .insert({
          ...planData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          throw new Error('Workout plans feature is not available yet. Please contact support.');
        }
        throw error;
      }
      
      setWorkoutPlans(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating workout plan:', error);
      throw error;
    }
  };

  const updateWorkoutPlan = async (planId: string, updates: Partial<WorkoutPlan>) => {
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          throw new Error('Workout plans feature is not available yet. Please contact support.');
        }
        throw error;
      }
      
      setWorkoutPlans(prev => 
        prev.map(plan => plan.id === planId ? data : plan)
      );
      return data;
    } catch (error) {
      console.error('Error updating workout plan:', error);
      throw error;
    }
  };

  const deleteWorkoutPlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('workout_plans')
        .update({ is_active: false })
        .eq('id', planId);

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          throw new Error('Workout plans feature is not available yet. Please contact support.');
        }
        throw error;
      }
      
      setWorkoutPlans(prev => prev.filter(plan => plan.id !== planId));
    } catch (error) {
      console.error('Error deleting workout plan:', error);
      throw error;
    }
  };

  const assignPlanToClient = async (planId: string, clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .update({ 
          client_id: clientId,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          throw new Error('Workout plans feature is not available yet. Please contact support.');
        }
        throw error;
      }
      
      setWorkoutPlans(prev => 
        prev.map(plan => plan.id === planId ? data : plan)
      );
      return data;
    } catch (error) {
      console.error('Error assigning plan to client:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchWorkoutPlans();
  }, [user, coachData]);

  return {
    workoutPlans,
    loading,
    fetchWorkoutPlans,
    createWorkoutPlan,
    updateWorkoutPlan,
    deleteWorkoutPlan,
    assignPlanToClient,
  };
};