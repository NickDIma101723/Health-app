import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/database.types';

type Coach = Database['public']['Tables']['coaches']['Row'];
type UserCoach = Database['public']['Tables']['user_coaches']['Row'];

interface CoachWithStatus extends Coach {
  isAssigned: boolean;
  assignedAt?: string;
}

export const useCoaches = () => {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [myCoach, setMyCoach] = useState<CoachWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoaches = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('coaches')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      
      setCoaches(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch coaches');
      console.error('Error fetching coaches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCoach = async () => {
    if (!user) {
      console.log('[useCoaches] No user, setting loading to false');
      setLoading(false);
      return;
    }

    console.log('[useCoaches] Fetching coach for user:', user.id);

    try {
      setLoading(true);
      
      console.log('[useCoaches] Querying coach_client_assignments...');
      const { data: assignment, error: assignmentError } = await supabase
        .from('coach_client_assignments')
        .select('coach_id, assigned_at, is_active')
        .eq('client_user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      console.log('[useCoaches] Assignment query result:', { assignment, error: assignmentError });

      if (assignmentError) {
        console.log('[useCoaches] Assignment error:', assignmentError);
        if (
          assignmentError.code === 'PGRST116' || 
          assignmentError.code === '42P01' ||
          assignmentError.code === 'PGRST301' ||
          assignmentError.message?.includes('406')
        ) {
          console.log('[useCoaches] ℹ️ No coach assignment found - this is OK');
          setMyCoach(null);
          setError(null);
          setLoading(false);
          return;
        }
        throw assignmentError;
      }

      if (assignment) {
        console.log('[useCoaches] Found assignment, fetching coach details...');
        const { data: coachData, error: coachError } = await supabase
          .from('coaches')
          .select('*')
          .eq('id', assignment.coach_id)
          .maybeSingle();

        console.log('[useCoaches] Coach data result:', { coachData, error: coachError });

        if (coachError) {
          console.error('[useCoaches] ❌ Error fetching coach details:', coachError);
          setMyCoach(null);
          setError(null);
          setLoading(false);
          return;
        }

        if (coachData) {
          console.log('[useCoaches] ✅ Set myCoach:', coachData.full_name);
          setMyCoach({
            ...coachData,
            isAssigned: true,
            assignedAt: assignment.assigned_at,
          });
        } else {
          setMyCoach(null);
        }
      } else {
        setMyCoach(null);
      }
      
      setError(null);
    } catch (err: any) {
      console.error('[useCoaches] ❌ Error in fetchMyCoach:', err);
      setMyCoach(null);
      setError(null);
    } finally {
      console.log('[useCoaches] Setting loading to FALSE (completed)');
      setLoading(false);
    }
  };

  const assignCoach = async (coachId: string) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const { data: existing } = await supabase
        .from('coach_client_assignments')
        .select('*')
        .eq('client_user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('coach_client_assignments')
          .update({ is_active: false })
          .eq('id', existing.id);
      }

      const { data, error: insertError } = await supabase
        .from('coach_client_assignments')
        .insert({
          client_user_id: user.id,
          coach_id: coachId,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      await fetchMyCoach();
      
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to assign coach' };
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyCoach();
    }
  }, [user]);

  return {
    coaches,
    myCoach,
    loading,
    error,
    fetchCoaches,
    fetchMyCoach,
    assignCoach,
  };
};
