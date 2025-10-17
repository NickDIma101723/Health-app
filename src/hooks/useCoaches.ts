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

// Global coach assignment storage (in-memory)
const globalCoachAssignments: { [userId: string]: string } = {};

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
        console.log('[useCoaches] Using sample coaches');
        setCoaches(SAMPLE_COACHES);
      } else {
        console.log('[useCoaches] Using database coaches:', data.length);
        setCoaches(data);
      }
    } catch (err) {
      console.log('[useCoaches] Error, using sample coaches');
      setCoaches(SAMPLE_COACHES);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCoach = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    console.log('[useCoaches] 🔍 Fetching coach for user:', user.id);
    setLoading(true);
    
    try {
      // First check global in-memory storage (fastest)
      const storedCoachId = globalCoachAssignments[user.id];
      console.log('[useCoaches] Global storage check:', storedCoachId);
      
      if (storedCoachId) {
        const coach = SAMPLE_COACHES.find(c => c.id === storedCoachId);
        if (coach) {
          console.log('[useCoaches] ✅ Found coach in memory:', coach.full_name);
          setMyCoach({
            ...coach,
            isAssigned: true,
            assignedAt: new Date().toISOString(),
          });
          setLoading(false);
          return;
        }
      }

      // Then check database
      const { data: assignment } = await supabase
        .from('coach_client_assignments')
        .select('coach_id, assigned_at')
        .eq('client_user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (assignment) {
        const { data: coachData } = await supabase
          .from('coaches')
          .select('*')
          .eq('id', assignment.coach_id)
          .maybeSingle();

        if (coachData) {
          console.log('[useCoaches] ✅ Found coach in database:', coachData.full_name);
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
      console.log('[useCoaches] ❌ No coach assigned');
      setMyCoach(null);
    } catch (err) {
      console.error('[useCoaches] Error:', err);
      
      // Fallback to global storage on error
      const storedCoachId = globalCoachAssignments[user.id];
      if (storedCoachId) {
        const coach = SAMPLE_COACHES.find(c => c.id === storedCoachId);
        if (coach) {
          console.log('[useCoaches] Found coach in memory (error fallback):', coach.full_name);
          setMyCoach({
            ...coach,
            isAssigned: true,
            assignedAt: new Date().toISOString(),
          });
        }
      } else {
        setMyCoach(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const assignCoach = async (coachId: string) => {
    if (!user) {
      console.log('[useCoaches] ❌ Cannot assign - no user logged in');
      return { error: 'No user logged in' };
    }

    console.log('[useCoaches] 📝 Starting assignment. User ID:', user.id, 'Coach ID:', coachId);

    try {
      const coach = coaches.find(c => c.id === coachId) || SAMPLE_COACHES.find(c => c.id === coachId);
      if (!coach) {
        console.log('[useCoaches] ❌ Coach not found:', coachId);
        return { error: 'Coach not found' };
      }

      console.log('[useCoaches] ✅ Found coach:', coach.full_name);

      // Try database assignment first
      try {
        // Deactivate existing assignments
        await supabase
          .from('coach_client_assignments')
          .update({ is_active: false })
          .eq('client_user_id', user.id)
          .eq('is_active', true);

        // Create new assignment
        const { error: insertError } = await supabase
          .from('coach_client_assignments')
          .insert({
            client_user_id: user.id,
            coach_id: coachId,
            is_active: true,
          });

        if (!insertError) {
          console.log('[useCoaches] ✅ Assigned coach in database');
        }
      } catch (dbError) {
        console.log('[useCoaches] Database assignment failed, using global storage');
      }

      // Always store in global memory
      globalCoachAssignments[user.id] = coachId;
      console.log('[useCoaches] 💾 Saved to global storage. User:', user.id, 'Coach:', coachId);
      console.log('[useCoaches] 💾 Full global storage:', JSON.stringify(globalCoachAssignments));

      // Set immediately
      setMyCoach({
        ...coach,
        isAssigned: true,
        assignedAt: new Date().toISOString(),
      });

      console.log('[useCoaches] ✅ Coach assigned:', coach.full_name, 'for user:', user.id);

      return { data: { coach_id: coachId }, error: null };
    } catch (err: any) {
      console.error('Error assigning coach:', err);
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
