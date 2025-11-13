import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/database.types';

type Coach = Database['public']['Tables']['coaches']['Row'];
type UserCoach = Database['public']['Tables']['user_coaches']['Row'];

interface CoachWithStatus extends Coach {
  isAssigned: boolean;
  assignedAt?: string;
}

// Storage key for coach assignments
const COACH_ASSIGNMENT_KEY = '@coach_assignments';

// Sample coaches that are always available
const SAMPLE_COACHES: Coach[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    user_id: '00000000-0000-0000-0000-000000000001',
    full_name: 'Sarah Johnson',
    email: 'sarah.johnson@healthcoach.com',
    specialization: 'Nutrition',
    bio: 'Certified nutritionist with 10+ years of experience helping clients achieve their dietary goals. Specializes in weight management and meal planning.',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    user_id: '00000000-0000-0000-0000-000000000002',
    full_name: 'Mike Chen',
    email: 'mike.chen@healthcoach.com',
    specialization: 'Fitness',
    bio: 'Personal trainer and fitness coach with expertise in strength training, cardio optimization, and injury prevention. Helped 200+ clients transform their lives.',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    user_id: '00000000-0000-0000-0000-000000000003',
    full_name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@healthcoach.com',
    specialization: 'Mental Health',
    bio: 'Licensed psychologist specializing in stress management, mindfulness, and cognitive behavioral therapy. Passionate about holistic wellness.',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '40000000-0000-0000-0000-000000000004',
    user_id: '00000000-0000-0000-0000-000000000004',
    full_name: 'David Kim',
    email: 'david.kim@healthcoach.com',
    specialization: 'Weight Loss',
    bio: 'Weight loss specialist who lost 100lbs himself. Expert in sustainable lifestyle changes, portion control, and motivation coaching.',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '50000000-0000-0000-0000-000000000005',
    user_id: '00000000-0000-0000-0000-000000000005',
    full_name: 'Jessica Martinez',
    email: 'jessica.martinez@healthcoach.com',
    specialization: 'Sports',
    bio: 'Former Olympic athlete turned performance coach. Specializes in athletic training, sports nutrition, and competition preparation.',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '60000000-0000-0000-0000-000000000006',
    user_id: '00000000-0000-0000-0000-000000000006',
    full_name: 'Robert Taylor',
    email: 'robert.taylor@healthcoach.com',
    specialization: 'General',
    bio: 'Holistic health coach focusing on overall wellness, lifestyle medicine, and preventive health. 15 years in the wellness industry.',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const useCoaches = () => {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>(SAMPLE_COACHES);
  const [myCoach, setMyCoach] = useState<CoachWithStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCoaches = async () => {
    setLoading(true);
    try {
      // Try to fetch from database, fallback to samples
      const { data, error: fetchError } = await supabase
        .from('coaches')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (fetchError || !data || data.length === 0) {
        setCoaches(SAMPLE_COACHES);
      } else {
        setCoaches(data);
      }
    } catch (err) {
      setCoaches(SAMPLE_COACHES);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCoach = async (forceRefresh: boolean = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      // First check AsyncStorage (persists across reloads)
      const storedData = await AsyncStorage.getItem(COACH_ASSIGNMENT_KEY);
      const storedAssignments = storedData ? JSON.parse(storedData) : {};
      const storedCoachId = storedAssignments[user.id];
      
      if (storedCoachId) {
        // First check in loaded coaches
        let coach = coaches.find(c => c.id === storedCoachId);
        // Then check in SAMPLE_COACHES
        if (!coach) {
          coach = SAMPLE_COACHES.find(c => c.id === storedCoachId);
        }
        
        if (coach) {
          setMyCoach({
            ...coach,
            isAssigned: true,
            assignedAt: new Date().toISOString(),
          });
          setLoading(false);
          return;
        }
      }

      // Then check database - get most recent assignment
      const { data: assignment } = await supabase
        .from('coach_client_assignments')
        .select('coach_id, assigned_at')
        .eq('client_user_id', user.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assignment) {
        const { data: coachData } = await supabase
          .from('coaches')
          .select('*')
          .eq('id', assignment.coach_id)
          .maybeSingle();

        if (coachData) {
          setMyCoach({
            ...coachData,
            isAssigned: true,
            assignedAt: assignment.assigned_at,
          });
          setLoading(false);
          return;
        }
      }

      // No coach found
      setMyCoach(null);
    } catch (err) {
      console.error('[useCoaches] Error:', err);
      
      // Fallback to AsyncStorage on error
      try {
        const storedData = await AsyncStorage.getItem(COACH_ASSIGNMENT_KEY);
        const storedAssignments = storedData ? JSON.parse(storedData) : {};
        const storedCoachId = storedAssignments[user.id];
        
        if (storedCoachId) {
          let coach = coaches.find(c => c.id === storedCoachId);
          if (!coach) {
            coach = SAMPLE_COACHES.find(c => c.id === storedCoachId);
          }
          if (coach) {
            setMyCoach({
              ...coach,
              isAssigned: true,
              assignedAt: new Date().toISOString(),
            });
          }
        } else {
          setMyCoach(null);
        }
      } catch (storageError) {
        console.error('[useCoaches] AsyncStorage error:', storageError);
        setMyCoach(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMyCoaches = async () => {
    if (!user) return [];

    try {
      console.log('🔍 [useCoaches] Fetching all coaches for user:', user.id);
      
      // Get all active assignments for this client
      const { data: assignments, error } = await supabase
        .from('coach_client_assignments')
        .select('coach_id, assigned_at')
        .eq('client_user_id', user.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      console.log('🔍 [useCoaches] Coach assignments query result:', { assignments, error });

      if (error || !assignments) {
        console.log('🔍 [useCoaches] No assignments found or error occurred');
        return [];
      }

      // Get coach details for each assignment
      const coachIds = assignments.map(a => a.coach_id);
      console.log('🔍 [useCoaches] Coach IDs to fetch:', coachIds);
      
      const { data: coachesData, error: coachesError } = await supabase
        .from('coaches')
        .select('*')
        .in('id', coachIds)
        .eq('is_active', true);

      console.log('🔍 [useCoaches] Coaches data query result:', { coachesData, coachesError });

      if (coachesError || !coachesData) {
        console.log('🔍 [useCoaches] No coaches data found or error occurred');
        return [];
      }

      // Combine with assignment info
      const result = coachesData.map(coach => {
        const assignment = assignments.find(a => a.coach_id === coach.id);
        return {
          ...coach,
          isAssigned: true,
          assignedAt: assignment?.assigned_at || new Date().toISOString(),
        };
      });

      console.log('🔍 [useCoaches] Final coaches result:', result);
      return result;
    } catch (err) {
      console.error('Error fetching all coaches:', err);
      return [];
    }
  };

  const removeCoach = async (coachId: string) => {
    if (!user) return { error: 'No user logged in' };

    try {
      // Deactivate the specific assignment
      const { error } = await supabase
        .from('coach_client_assignments')
        .update({ is_active: false })
        .eq('client_user_id', user.id)
        .eq('coach_id', coachId)
        .eq('is_active', true);

      if (error) throw error;

      // If this was the current "myCoach", update to the next most recent one
      if (myCoach && myCoach.id === coachId) {
        await fetchMyCoach();
      }

      return { error: null };
    } catch (err: any) {
      console.error('Error removing coach:', err);
      return { error: err.message || 'Failed to remove coach' };
    }
  };

  const assignCoach = async (coachId: string) => {
    if (!user) {
      return { error: 'No user logged in' };
    }

    try {
      const coach = coaches.find(c => c.id === coachId) || SAMPLE_COACHES.find(c => c.id === coachId);
      if (!coach) {
        return { error: 'Coach not found' };
      }

      // Try database assignment first
      try {
        // Check if assignment already exists
        const { data: existingAssignment } = await supabase
          .from('coach_client_assignments')
          .select('*')
          .eq('client_user_id', user.id)
          .eq('coach_id', coachId)
          .eq('is_active', true)
          .single();

        if (existingAssignment) {
          // Assignment already exists and is active - no need to do anything
          console.log('🔍 [assignCoach] Coach already assigned to this client');
        } else {
          // Create new assignment (keeping all existing coaches)
          console.log('🔍 [assignCoach] Creating new assignment:', {
            client_user_id: user.id,
            coach_id: coachId
          });
          
          const { data: insertData, error: insertError } = await supabase
            .from('coach_client_assignments')
            .insert({
              client_user_id: user.id,
              coach_id: coachId,
              is_active: true,
              assigned_at: new Date().toISOString(),
              notes: 'Coach assigned by client',
            })
            .select();

          console.log('🔍 [assignCoach] Insert result:', { insertData, insertError });
          
          if (insertError) throw insertError;
        }
      } catch (dbError) {
        console.log('[useCoaches] Database assignment failed, using local storage');
      }

      // Always store in AsyncStorage (persists across reloads)
      try {
        const storedData = await AsyncStorage.getItem(COACH_ASSIGNMENT_KEY);
        const storedAssignments = storedData ? JSON.parse(storedData) : {};
        storedAssignments[user.id] = coachId;
        await AsyncStorage.setItem(COACH_ASSIGNMENT_KEY, JSON.stringify(storedAssignments));
      } catch (storageError) {
        console.error('[useCoaches] AsyncStorage save failed:', storageError);
      }

      // Set immediately
      setMyCoach({
        ...coach,
        isAssigned: true,
        assignedAt: new Date().toISOString(),
      });

      return { data: { coach_id: coachId }, error: null };
    } catch (err: any) {
      console.error('Error assigning coach:', err);
      return { data: null, error: err.message || 'Failed to assign coach' };
    }
  };

  useEffect(() => {
    if (user && !myCoach) {
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
    fetchAllMyCoaches,
    assignCoach,
    removeCoach,
  };
};
