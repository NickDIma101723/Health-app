import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/database.types';

type Activity = Database['public']['Tables']['activities']['Row'];
type ActivityInsert = Database['public']['Tables']['activities']['Insert'];
type ActivityUpdate = Database['public']['Tables']['activities']['Update'];
type ActivityTemplate = Database['public']['Tables']['activity_templates']['Row'];
type WeeklyGoals = Database['public']['Tables']['weekly_goals']['Row'];

export const useActivities = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const getWeekStart = (date: Date = new Date()): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  };

  const fetchActivities = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (isFetching) return;

    try {
      setIsFetching(true);
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (fetchError) throw fetchError;
      
      setActivities(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch activities');
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('activity_templates')
        .select('*')
        .order('title', { ascending: true });

      if (fetchError) throw fetchError;
      
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
    }
  };

  const fetchWeeklyGoals = async () => {
    if (!user) return;

    try {
      const weekStart = getWeekStart();
      
      let { data, error: fetchError } = await supabase
        .from('weekly_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStart)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabase
          .from('weekly_goals')
          .insert({
            user_id: user.id,
            week_start_date: weekStart,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        data = newData;
      } else if (fetchError) {
        throw fetchError;
      }

      setWeeklyGoals(data);
    } catch (err: any) {
      console.error('Error fetching weekly goals:', err);
    }
  };

  const addActivity = async (activity: Omit<ActivityInsert, 'user_id'>) => {
    if (!user) return { data: null, error: 'No user logged in' };

    try {
      const newActivity: ActivityInsert = {
        ...activity,
        user_id: user.id,
      };

      const { data, error: insertError } = await supabase
        .from('activities')
        .insert(newActivity)
        .select()
        .single();

      if (insertError) throw insertError;
      
      
      return { data, error: null };
    } catch (err: any) {
      console.error('Failed to add activity:', err);
      return { data: null, error: err.message || 'Failed to add activity' };
    }
  };

  const updateActivity = async (id: string, updates: ActivityUpdate) => {
    if (!user) return { data: null, error: 'No user logged in' };

    try {
      const { data, error: updateError } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      
      return { data, error: null };
    } catch (err: any) {
      console.error('Failed to update activity:', err);
      return { data: null, error: err.message || 'Failed to update activity' };
    }
  };

  const deleteActivity = async (id: string) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const { error: deleteError } = await supabase
        .from('activities')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      
      
      return { error: null };
    } catch (err: any) {
      console.error('Failed to delete activity:', err);
      return { error: err.message || 'Failed to delete activity' };
    }
  };

  const toggleActivityStatus = async (id: string) => {
    const activity = activities.find(a => a.id === id);
    if (!activity) return;

    const statusCycle: Record<Activity['status'], Activity['status']> = {
      incomplete: 'completed',
      completed: 'failed',
      failed: 'incomplete',
    };

    const oldStatus = activity.status;
    const newStatus = statusCycle[activity.status];

    await updateActivity(id, { status: newStatus });

    if (activity.activity_type === 'workout' && weeklyGoals) {
      const wasCompleted = oldStatus === 'completed';
      const isNowCompleted = newStatus === 'completed';
      
      if (!wasCompleted && isNowCompleted) {
        await updateWeeklyGoals({
          workouts_current: weeklyGoals.workouts_current + 1,
        });
      } else if (wasCompleted && !isNowCompleted) {
        await updateWeeklyGoals({
          workouts_current: Math.max(0, weeklyGoals.workouts_current - 1),
        });
      }
    }
  };

  const getActivitiesForDate = (date: string): Activity[] => {
    return activities.filter(a => a.date === date);
  };

  const getActivitiesForWeek = (startDate: string): Activity[] => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    
    return activities.filter(a => {
      const activityDate = new Date(a.date);
      return activityDate >= start && activityDate < end;
    });
  };

  const updateWeeklyGoals = async (updates: Partial<WeeklyGoals>) => {
    if (!user || !weeklyGoals) return { error: 'No weekly goals found' };

    try {
      const { data, error: updateError } = await supabase
        .from('weekly_goals')
        .update(updates)
        .eq('id', weeklyGoals.id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      setWeeklyGoals(data);
      
      return { data, error: null };
    } catch (err: any) {
      console.error('Failed to update weekly goals:', err);
      return { data: null, error: err.message || 'Failed to update weekly goals' };
    }
  };

  useEffect(() => {
    if (user) {
      fetchActivities();
      fetchTemplates();
      fetchWeeklyGoals();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Luister naar live updates van activiteiten in de database
    const subscription = supabase
      .channel('activities_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Update de lijst meteen als er iets verandert
          if (payload.eventType === 'INSERT') {
            setActivities(prev => {
              
              const newActivity = payload.new as Activity;
              const exists = prev.some(a => a.id === newActivity.id);
              if (exists) return prev;
              
              // Voeg toe en sorteer op datum en tijd
              return [...prev, newActivity].sort((a, b) => {
                const dateCompare = a.date.localeCompare(b.date);
                if (dateCompare !== 0) return dateCompare;
                return a.time.localeCompare(b.time);
              });
            });
          } else if (payload.eventType === 'UPDATE') {
            // Vervang de oude activiteit met de nieuwe
            setActivities(prev => prev.map(a => a.id === payload.new.id ? payload.new as Activity : a));
          } else if (payload.eventType === 'DELETE') {
            // Haal de verwijderde activiteit uit de lijst
            setActivities(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Stop met luisteren als dit component weg gaat
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return {
    activities,
    templates,
    weeklyGoals,
    loading,
    error,
    addActivity,
    updateActivity,
    deleteActivity,
    toggleActivityStatus,
    getActivitiesForDate,
    getActivitiesForWeek,
    updateWeeklyGoals,
    refetch: fetchActivities,
  };
};
