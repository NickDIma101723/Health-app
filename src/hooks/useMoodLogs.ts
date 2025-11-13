import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/database.types';

type MoodLog = Database['public']['Tables']['mood_logs']['Row'];
type MoodLogInsert = Database['public']['Tables']['mood_logs']['Insert'];
type MoodLogUpdate = Database['public']['Tables']['mood_logs']['Update'];

// Cache for mood logs to prevent duplicate requests
const moodLogCache = new Map<string, { data: MoodLog | null; timestamp: number }>();
const recentMoodsCache = new Map<string, { data: MoodLog[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const REQUEST_COOLDOWN = 1000; // 1 second between requests

export const useMoodLogs = (date?: string) => {
  const { user } = useAuth();
  const [moodLog, setMoodLog] = useState<MoodLog | null>(null);
  const [recentMoods, setRecentMoods] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const lastFetchTime = useRef<number>(0);
  const pendingRequests = useRef<Set<string>>(new Set());
  const retryCount = useRef<number>(0);

  const targetDate = date || new Date().toISOString().split('T')[0];

  // Debounce function to prevent rapid successive calls
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  // Check if we can use cached data
  const getCachedMoodLog = (userId: string, date: string) => {
    const cacheKey = `${userId}-${date}`;
    const cached = moodLogCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  };

  // Cache mood log data
  const setCachedMoodLog = (userId: string, date: string, data: MoodLog | null) => {
    const cacheKey = `${userId}-${date}`;
    moodLogCache.set(cacheKey, { data, timestamp: Date.now() });
  };

  const fetchTodayMood = async (forceRefresh: boolean = false) => {
    if (!user) {
      console.log('[useMoodLogs] No user found, skipping fetch');
      setLoading(false);
      return;
    }

    if (!targetDate) {
      console.error('[useMoodLogs] No target date provided');
      setError('Invalid date');
      setLoading(false);
      return;
    }

    // Rate limiting - prevent too many requests
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime.current < REQUEST_COOLDOWN) {
      setLoading(false);
      return;
    }

    // Check for pending requests to avoid duplicates
    const requestKey = `${user.id}-${targetDate}`;
    if (pendingRequests.current.has(requestKey)) {
      console.log('[useMoodLogs] Request already pending, skipping');
      return;
    }

    // Check cache first
    if (!forceRefresh) {
      const cachedData = getCachedMoodLog(user.id, targetDate);
      if (cachedData !== null) {

        setMoodLog(cachedData);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      lastFetchTime.current = now;
      pendingRequests.current.add(requestKey);
      
      const { data: fetchResults, error: fetchError } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .order('created_at', { ascending: false });

      let data = null;
      
      // Handle duplicates in fetch as well
      if (fetchResults && fetchResults.length > 1) {
        console.log('[useMoodLogs] Found duplicate mood logs in fetch, cleaning up...');
        data = fetchResults[0]; // Use the most recent one
        
        // Delete the duplicate records
        const duplicateIds = fetchResults.slice(1).map(log => log.id);
        if (duplicateIds.length > 0) {
          await supabase
            .from('mood_logs')
            .delete()
            .in('id', duplicateIds);
          console.log(`[useMoodLogs] Deleted ${duplicateIds.length} duplicate records in fetch`);
        }
      } else if (fetchResults && fetchResults.length === 1) {
        data = fetchResults[0];
      }

      if (fetchError) {
        console.error('[useMoodLogs] Database error:', fetchError);
        
        // Handle specific error codes with backoff
        if (fetchError.code === 'PGRST301' || fetchError.code === '406') {
          retryCount.current++;
          if (retryCount.current < 3) {
            console.log(`[useMoodLogs] Retrying in ${retryCount.current * 1000}ms...`);
            setTimeout(() => {
              fetchTodayMood(true);
            }, retryCount.current * 1000);
            return;
          } else {
            setError('Database connection issue. Please check your internet connection.');
            retryCount.current = 0;
          }
        } else if (fetchError.code === 'PGRST116') {
          // No rows found - this is normal, cache the null result
          setMoodLog(null);
          setCachedMoodLog(user.id, targetDate, null);
          setError(null);
        } else {
          setError(`Failed to fetch mood log: ${fetchError.message}`);
        }
        return;
      }

      // Reset retry count on success
      retryCount.current = 0;

      if (data && typeof data === 'object') {
        setMoodLog(data);
        setCachedMoodLog(user.id, targetDate, data);
      } else {
        setMoodLog(null);
        setCachedMoodLog(user.id, targetDate, null);
      }
      setError(null);
    } catch (err: any) {
      console.error('[useMoodLogs] Unexpected error:', err);
      if (err.name === 'NetworkError') {
        setError('Network connection error. Please check your internet.');
      } else if (err.message) {
        setError(`Error: ${err.message}`);
      } else {
        setError('Failed to fetch mood log. Please try again.');
      }
    } finally {
      pendingRequests.current.delete(requestKey);
      setLoading(false);
    }
  };

  const fetchRecentMoods = async (limit = 7, forceRefresh: boolean = false) => {
    if (!user) {
      console.log('[useMoodLogs] No user found, skipping recent moods fetch');
      return;
    }

    if (!limit || limit <= 0) {
      console.warn('[useMoodLogs] Invalid limit provided, using default');
      limit = 7;
    }

    // Check cache for recent moods
    const cacheKey = `${user.id}-recent-${limit}`;
    if (!forceRefresh) {
      const cached = recentMoodsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {

        setRecentMoods(cached.data);
        return;
      }
    }

    // Prevent duplicate requests
    if (pendingRequests.current.has(cacheKey)) {
      console.log('[useMoodLogs] Recent moods request already pending');
      return;
    }

    try {
      pendingRequests.current.add(cacheKey);
      
      const { data, error: fetchError } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(limit);

      if (fetchError) {
        console.error('[useMoodLogs] Error fetching recent moods:', fetchError);
        if (fetchError.code === 'PGRST301') {
          console.error('Database connection issue');
        } else {
          console.error(`Database error: ${fetchError.message}`);
        }
        return;
      }

      if (Array.isArray(data)) {
        setRecentMoods(data);
        // Cache the result
        recentMoodsCache.set(cacheKey, { data, timestamp: Date.now() });
      } else {
        console.warn('[useMoodLogs] Received non-array data for recent moods');
        setRecentMoods([]);
        recentMoodsCache.set(cacheKey, { data: [], timestamp: Date.now() });
      }
    } catch (err: any) {
      console.error('[useMoodLogs] Unexpected error fetching recent moods:', err);
      if (err.name === 'NetworkError') {
        console.error('Network error while fetching recent moods');
      }
      // Don't set error state for recent moods as it's not critical
      setRecentMoods([]);
    } finally {
      pendingRequests.current.delete(cacheKey);
    }
  };

  const logMood = async (
    mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible',
    energyLevel?: number,
    stressLevel?: number,
    notes?: string
  ) => {
    if (!user) {
      console.error('[useMoodLogs] No user logged in');
      return { error: 'No user logged in' };
    }

    if (!mood || !['great', 'good', 'okay', 'bad', 'terrible'].includes(mood)) {
      console.error('[useMoodLogs] Invalid mood provided:', mood);
      return { error: 'Invalid mood selection' };
    }

    if (!targetDate) {
      console.error('[useMoodLogs] No target date available');
      return { error: 'Invalid date' };
    }

    if (energyLevel && (energyLevel < 1 || energyLevel > 5)) {
      console.warn('[useMoodLogs] Energy level out of range:', energyLevel);
      energyLevel = undefined;
    }

    if (stressLevel && (stressLevel < 1 || stressLevel > 5)) {
      console.warn('[useMoodLogs] Stress level out of range:', stressLevel);
      stressLevel = undefined;
    }

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



      // Simple approach: delete any existing records for this date and create fresh
      // This avoids all the complexity with duplicates and 406 errors
      const { error: deleteError } = await supabase
        .from('mood_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('date', targetDate);
      
      if (deleteError) {
        console.error('[useMoodLogs] Error clearing existing mood log:', deleteError);
        // Don't fail here - maybe there was nothing to delete
      }

      // Now create a fresh mood log
      const { data, error } = await supabase
        .from('mood_logs')
        .insert(newLog)
        .select()
        .single();
        
      if (error) {
        console.error('[useMoodLogs] Error creating mood log:', error);
        if (error.code === 'PGRST301') {
          return { error: 'Database connection error while saving mood.' };
        } else if (error.code === '23505') {
          return { error: 'Mood already logged for this date.' };
        } else {
          return { error: `Failed to save mood: ${error.message}` };
        }
      }

      if (!data) {
        console.error('[useMoodLogs] No data returned from database operation');
        return { error: 'Failed to save mood - no data returned' };
      }
      

      setMoodLog(data);
      
      // Try to fetch recent moods, but don't fail if it doesn't work
      try {
        await fetchRecentMoods(7, true); // Force refresh after logging
      } catch (recentError) {
        console.warn('[useMoodLogs] Failed to refresh recent moods:', recentError);
        // Don't return error for this - mood was saved successfully
      }
      
      return { data, error: null };
    } catch (err: any) {
      console.error('[useMoodLogs] Unexpected error in logMood:', err);
      if (err.name === 'NetworkError') {
        return { data: null, error: 'Network connection error. Please check your internet and try again.' };
      } else if (err.message) {
        return { data: null, error: `Error: ${err.message}` };
      } else {
        return { data: null, error: 'Failed to log mood. Please try again.' };
      }
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
        .maybeSingle();

      if (updateError) throw updateError;
      
      setMoodLog(data);
      await fetchRecentMoods();
      
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update mood' };
    }
  };

  // Create debounced versions of fetch functions
  const debouncedFetchTodayMood = useCallback(
    debounce(() => fetchTodayMood(), 300),
    [user, targetDate]
  );

  const debouncedFetchRecentMoods = useCallback(
    debounce(() => fetchRecentMoods(), 300),
    [user]
  );

  useEffect(() => {
    if (user) {
      // Use debounced functions to prevent rapid successive calls
      debouncedFetchTodayMood();
      debouncedFetchRecentMoods();

      // Set up real-time subscriptions with debouncing
      const channel = supabase
        .channel(`mood_logs_changes_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mood_logs',
            filter: `user_id=eq.${user.id}`,
          },
          debounce(() => {
            console.log('[useMoodLogs] Real-time update received');
            fetchTodayMood(true); // Force refresh on real-time updates
            fetchRecentMoods(7, true);
          }, 500)
        )
        .subscribe();

      return () => {
        console.log('[useMoodLogs] Cleaning up subscriptions and cache');
        supabase.removeChannel(channel);
        
        // Clear any pending requests
        pendingRequests.current.clear();
        
        // Clear old cache entries (older than cache duration)
        const now = Date.now();
        for (const [key, value] of moodLogCache.entries()) {
          if (now - value.timestamp > CACHE_DURATION) {
            moodLogCache.delete(key);
          }
        }
        for (const [key, value] of recentMoodsCache.entries()) {
          if (now - value.timestamp > CACHE_DURATION) {
            recentMoodsCache.delete(key);
          }
        }
      };
    }
  }, [user, targetDate, debouncedFetchTodayMood, debouncedFetchRecentMoods]);

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
