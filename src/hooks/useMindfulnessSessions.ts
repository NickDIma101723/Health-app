import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/database.types';

type MindfulnessSession = Database['public']['Tables']['mindfulness_sessions']['Row'];
type MindfulnessSessionInsert = Database['public']['Tables']['mindfulness_sessions']['Insert'];
type MindfulnessSessionUpdate = Database['public']['Tables']['mindfulness_sessions']['Update'];

interface SessionStats {
  totalSessions: number;
  totalMinutes: number;
  completedToday: number;
  currentStreak: number;
  favoriteType: string;
  thisWeekSessions: number;
}

export const useMindfulnessSessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<MindfulnessSession[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async (limit = 10) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('mindfulness_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      setSessions(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch mindfulness sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      const { data: allSessions, error: fetchError } = await supabase
        .from('mindfulness_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('started_at', { ascending: false });

      if (fetchError) throw fetchError;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const totalSessions = allSessions?.length || 0;
      const totalMinutes = Math.floor((allSessions?.reduce((sum, s) => sum + s.duration_seconds, 0) || 0) / 60);
      const completedToday = allSessions?.filter(s => 
        new Date(s.started_at) >= today
      ).length || 0;

      let currentStreak = 0;
      if (allSessions && allSessions.length > 0) {
        const sortedDates = Array.from(new Set(
          allSessions.map(s => new Date(s.started_at).toDateString())
        )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        let checkDate = new Date(today);
        for (const dateStr of sortedDates) {
          const sessionDate = new Date(dateStr);
          if (sessionDate.toDateString() === checkDate.toDateString()) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else if (sessionDate < checkDate) {
            break;
          }
        }
      }

      const typeCounts: { [key: string]: number } = {};
      allSessions?.forEach(s => {
        typeCounts[s.session_type] = (typeCounts[s.session_type] || 0) + 1;
      });
      const favoriteType = Object.keys(typeCounts).reduce((a, b) => 
        typeCounts[a] > typeCounts[b] ? a : b, 'breathing'
      );

      const thisWeekSessions = allSessions?.filter(s => 
        new Date(s.started_at) >= weekAgo
      ).length || 0;

      setStats({
        totalSessions,
        totalMinutes,
        completedToday,
        currentStreak,
        favoriteType,
        thisWeekSessions,
      });
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const startSession = async (
    sessionType: 'breathing' | 'meditation' | 'body_scan' | 'visualization',
    durationSeconds: number,
    moodBefore?: string
  ) => {
    if (!user) return { data: null, error: 'No user logged in' };

    try {
      const newSession: MindfulnessSessionInsert = {
        user_id: user.id,
        session_type: sessionType,
        duration_seconds: durationSeconds,
        completed: false,
        mood_before: moodBefore || null,
        started_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from('mindfulness_sessions')
        .insert(newSession)
        .select()
        .single();

      if (insertError) throw insertError;
      
      await fetchSessions();
      
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to start session' };
    }
  };

  const completeSession = async (sessionId: string, moodAfter?: string, notes?: string) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const updates: MindfulnessSessionUpdate = {
        completed: true,
        completed_at: new Date().toISOString(),
        mood_after: moodAfter || null,
        notes: notes || null,
      };

      const { error: updateError } = await supabase
        .from('mindfulness_sessions')
        .update(updates)
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      
      await fetchSessions();
      await fetchStats();
      
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to complete session' };
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const { error: deleteError } = await supabase
        .from('mindfulness_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      
      await fetchSessions();
      await fetchStats();
      
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to delete session' };
    }
  };

  useEffect(() => {
    if (user) {
      fetchSessions();
      fetchStats();

      const channel = supabase
        .channel('mindfulness_sessions_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mindfulness_sessions',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchSessions();
            fetchStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return {
    sessions,
    stats,
    loading,
    error,
    startSession,
    completeSession,
    deleteSession,
    fetchSessions,
    fetchStats,
  };
};
