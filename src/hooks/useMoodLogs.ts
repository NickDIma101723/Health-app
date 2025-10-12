import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/database.types';

type MoodLog = Database['public']['Tables']['mood_logs']['Row'];
type MoodLogInsert = Database['public']['Tables']['mood_logs']['Insert'];
type MoodLogUpdate = Database['public']['Tables']['mood_logs']['Update'];

export const useMoodLogs = (date?: string) => {
  const { user } = useAuth();
  const [moodLog, setMoodLog] = useState<MoodLog | null>(null);
  const [recentMoods, setRecentMoods] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetDate = date || new Date().toISOString().split('T')[0];

  const fetchTodayMood = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setMoodLog(data || null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch mood log');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentMoods = async (limit = 7) => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      setRecentMoods(data || []);
    } catch (err: any) {
      console.error('Failed to fetch recent moods:', err);
    }
  };

  const logMood = async (
    mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible',
    energyLevel?: number,
    stressLevel?: number,
    notes?: string
  ) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const newLog: MoodLogInsert = {
        user_id: user.id,
        date: targetDate,
        mood,
        energy_level: energyLevel || null,
        stress_level: stressLevel || null,
        notes: notes || null,
        logged_at: new Date().toISOString(),
      };

      const { data, error: upsertError } = await supabase
        .from('mood_logs')
        .upsert(newLog, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (upsertError) throw upsertError;
      
      setMoodLog(data);
      await fetchRecentMoods();
      
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to log mood' };
    }
  };

  const updateMood = async (updates: Partial<MoodLogUpdate>) => {
    if (!user || !moodLog) return { error: 'No mood log to update' };

    try {
      const { data, error: updateError } = await supabase
        .from('mood_logs')
        .update(updates)
        .eq('id', moodLog.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      setMoodLog(data);
      await fetchRecentMoods();
      
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update mood' };
    }
  };

  useEffect(() => {
    if (user) {
      fetchTodayMood();
      fetchRecentMoods();

      const channel = supabase
        .channel('mood_logs_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mood_logs',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchTodayMood();
            fetchRecentMoods();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, targetDate]);

  return {
    moodLog,
    recentMoods,
    loading,
    error,
    logMood,
    updateMood,
    fetchTodayMood,
    fetchRecentMoods,
  };
};
