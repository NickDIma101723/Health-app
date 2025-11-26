import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/database.types';

type CoachRequest = {
  id: string;
  client_user_id: string;
  coach_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  requested_at: string;
  responded_at: string | null;
  responded_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  client_profile?: {
    full_name: string | null;
    bio: string | null;
    fitness_level: string | null;
    goals: string | null;
  };
  coach_profile?: {
    full_name: string;
    specialization: string | null;
  };
};

export const useCoachRequests = () => {
  const { user, coachData } = useAuth();
  const [requests, setRequests] = useState<CoachRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const CACHE_DURATION = 5000; // 5 seconds cache

  // Retry configuration
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const retryOperation = async <T>(
    operation: () => Promise<T>,
    operationName: string,
    retries = MAX_RETRIES
  ): Promise<T> => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        console.warn(`[${operationName}] Attempt ${i + 1} failed:`, error.message);
        
        if (i === retries) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        await sleep(RETRY_DELAY * Math.pow(2, i));
      }
    }
    throw new Error(`${operationName} failed after ${retries + 1} attempts`);
  };

  // Load requests for current coach
  const loadCoachRequests = async () => {
    if (!coachData?.id) return;
    if (loading) return; // Prevent duplicate requests
    
    // Check cache - don't refetch if data is fresh
    const now = Date.now();
    if (now - lastFetchTime.current < CACHE_DURATION && requests.length > 0) {
      console.log('[useCoachRequests] Using cached data');
      return;
    }

    setLoading(true);
    lastFetchTime.current = now;
    try {
      console.log('[useCoachRequests] Loading requests for coach:', coachData.id);
      
      // First get coach requests
      const { data: requestsData, error: fetchError } = await supabase
        .from('coach_requests')
        .select('*')
        .eq('coach_id', coachData.id)
        .order('requested_at', { ascending: false });

      if (fetchError) {
        console.error('[useCoachRequests] Error fetching requests:', fetchError);
        throw fetchError;
      }

      console.log('[useCoachRequests] Found requests:', requestsData?.length || 0);

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        setError(null);
        setLoading(false);
        return;
      }

      // Then get client profiles for each request
      const enrichedRequests: CoachRequest[] = await Promise.all(
        requestsData.map(async (request) => {
          try {
            // Get client profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('full_name, bio, fitness_level, goals')
              .eq('user_id', request.client_user_id)
              .single();

            if (profileError) {
              console.warn('[useCoachRequests] Profile error for user:', request.client_user_id, profileError);
            }

            // Get coach profile
            const { data: coach, error: coachError } = await supabase
              .from('coaches')
              .select('full_name, specialization')
              .eq('id', request.coach_id)
              .single();

            if (coachError) {
              console.warn('[useCoachRequests] Coach error for coach:', request.coach_id, coachError);
            }

            return {
              ...request,
              client_profile: profile || null,
              coach_profile: coach || null,
            };
          } catch (err) {
            console.error('[useCoachRequests] Error enriching request:', err);
            return {
              ...request,
              client_profile: null,
              coach_profile: null,
            };
          }
        })
      );

      console.log('[useCoachRequests] Enriched requests:', enrichedRequests.length);
      setRequests(enrichedRequests);
      setError(null);
    } catch (err: any) {
      console.error('[useCoachRequests] Error loading coach requests:', err);
      setError(err.message || 'Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Load requests sent by current user (client perspective)
  const loadUserRequests = async () => {
    if (!user) return;
    if (loading) return; // Prevent duplicate requests
    
    // Check cache
    const now = Date.now();
    if (now - lastFetchTime.current < CACHE_DURATION && requests.length > 0) {
      console.log('[useCoachRequests] Using cached user requests');
      return;
    }

    setLoading(true);
    lastFetchTime.current = now;
    try {
      console.log('[useCoachRequests] Loading user requests for:', user.id);
      
      // Get user's coach requests
      const { data: requestsData, error: fetchError } = await supabase
        .from('coach_requests')
        .select('*')
        .eq('client_user_id', user.id)
        .order('requested_at', { ascending: false });

      if (fetchError) {
        console.error('[useCoachRequests] Error fetching user requests:', fetchError);
        throw fetchError;
      }

      console.log('[useCoachRequests] Found user requests:', requestsData?.length || 0);

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        setError(null);
        setLoading(false);
        return;
      }

      // Enrich with coach profiles
      const enrichedRequests: CoachRequest[] = await Promise.all(
        requestsData.map(async (request) => {
          try {
            // Get coach profile
            const { data: coach, error: coachError } = await supabase
              .from('coaches')
              .select('full_name, specialization')
              .eq('id', request.coach_id)
              .single();

            if (coachError) {
              console.warn('[useCoachRequests] Coach error for coach:', request.coach_id, coachError);
            }

            return {
              ...request,
              coach_profile: coach || null,
            };
          } catch (err) {
            console.error('[useCoachRequests] Error enriching user request:', err);
            return {
              ...request,
              coach_profile: null,
            };
          }
        })
      );

      console.log('[useCoachRequests] Enriched user requests:', enrichedRequests.length);
      setRequests(enrichedRequests);
      setError(null);
    } catch (err: any) {
      console.error('[useCoachRequests] Error loading user requests:', err);
      setError(err.message || 'Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Send a coach request from client with better validation
  const sendCoachRequest = async (coachId: string, message?: string) => {
    if (!user) {
      return { error: 'You must be logged in to send a request' };
    }

    if (!coachId) {
      return { error: 'Coach ID is required' };
    }

    // Validate message length if provided
    if (message && message.length > 500) {
      return { error: 'Message must be less than 500 characters' };
    }

    try {
      console.log('Sending coach request:', { client_user_id: user.id, coach_id: coachId, message });

      // Check if any request already exists with this coach (pending, accepted, or recent rejected)
      const { data: existingRequests, error: checkError } = await supabase
        .from('coach_requests')
        .select('*')
        .eq('client_user_id', user.id)
        .eq('coach_id', coachId);

      if (checkError) {
        console.error('Error checking existing request:', checkError);
      }

      if (existingRequests && existingRequests.length > 0) {
        const pending = existingRequests.find(r => r.status === 'pending');
        const accepted = existingRequests.find(r => r.status === 'accepted');
        
        if (pending) {
          return { error: 'You already have a pending request with this coach' };
        }
        if (accepted) {
          return { error: 'This coach has already accepted your request' };
        }
        
        // If only rejected requests exist, delete them before creating new one
        const rejectedIds = existingRequests.filter(r => r.status === 'rejected').map(r => r.id);
        if (rejectedIds.length > 0) {
          await supabase
            .from('coach_requests')
            .delete()
            .in('id', rejectedIds);
        }
      }

      // Send the request
      const { data: requestData, error: insertError } = await supabase
        .from('coach_requests')
        .insert({
          client_user_id: user.id,
          coach_id: coachId,
          message: message?.trim() || null,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        if (insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
          return { error: 'You already have a pending request with this coach' };
        }
        throw insertError;
      }

      console.log('Coach request sent successfully:', requestData);

      return { data: requestData, error: null };
    } catch (err: any) {
      console.error('Error sending coach request:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send request. Please try again.';
      if (err.message?.includes('duplicate key')) {
        errorMessage = 'You already have a pending request with this coach';
      } else if (err.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      return { error: errorMessage };
    }
  };

  // Accept a coach request with optimistic updates
  const acceptRequest = async (requestId: string) => {
    console.log('[useCoachRequests] 🟢 acceptRequest called:', { requestId, user: !!user, coachData: !!coachData });
    
    if (!user || !coachData) {
      console.log('[useCoachRequests] 🟢 Missing data:', { user: !!user, coachData: !!coachData });
      return { error: 'Invalid coach data' };
    }

    // Prevent multiple simultaneous operations on the same request
    if (processingRequests.has(requestId)) {
      console.log('[useCoachRequests] 🟢 Request already processing:', requestId);
      return { error: 'Request is already being processed' };
    }

    setProcessingRequests(prev => new Set(prev).add(requestId));

    // Optimistic update - immediately update UI
    const originalRequests = [...requests];
    setRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, status: 'accepted' as const, responded_at: new Date().toISOString(), responded_by: user.id }
        : req
    ));

    try {
      console.log('[useCoachRequests] 🟢 Updating request status to accepted...');
      
      // First check if request is still pending
      const { data: currentRequest, error: checkError } = await supabase
        .from('coach_requests')
        .select('status, client_user_id')
        .eq('id', requestId)
        .single();

      if (checkError) {
        console.error('[useCoachRequests] 🟢 Error checking request:', checkError);
        throw new Error('Could not find the request');
      }

      if (currentRequest.status !== 'pending') {
        console.log('[useCoachRequests] 🟢 Request is no longer pending:', currentRequest.status);
        throw new Error(`Request has already been ${currentRequest.status}`);
      }

      // Update the status
      const { error: updateError } = await supabase
        .from('coach_requests')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
          responded_by: user.id,
        })
        .eq('id', requestId)
        .eq('status', 'pending');

      if (updateError) {
        console.error('[useCoachRequests] 🟢 Update error:', updateError);
        throw updateError;
      }

      console.log('[useCoachRequests] 🟢 Request status updated successfully');

      // Get the request details (use the one we already fetched)
      console.log('[useCoachRequests] 🟢 Using request details:', currentRequest);

      // Create coach-client assignment
      console.log('[useCoachRequests] 🟢 Creating coach-client assignment...');
      const { error: assignmentError } = await supabase
        .from('coach_client_assignments')
        .insert({
          coach_id: coachData.id,
          client_user_id: currentRequest.client_user_id,
          is_active: true,
          assigned_by: user.id,
          notes: 'Assigned via coach request approval',
        });

      if (assignmentError) {
        console.error('[useCoachRequests] 🟢 Assignment error:', assignmentError);
        throw assignmentError;
      }

      console.log('[useCoachRequests] 🟢 Assignment created successfully');

      // Notification removed due to RLS policy restrictions

      // Don't reload here - let real-time subscriptions handle it
      // This prevents infinite loops
      console.log('[useCoachRequests] 🟢 Accept request completed successfully');
      console.log('[useCoachRequests] 🟢 Client should now appear in chat list and manage clients');
      return { error: null, success: true };
    } catch (err: any) {
      console.error('[useCoachRequests] 🟢 Error accepting request:', err);
      
      // Revert optimistic update on failure
      setRequests(originalRequests);
      
      return { error: err.message || 'Failed to accept request. Please try again.' };
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Reject a coach request with optimistic updates
  const rejectRequest = async (requestId: string) => {
    console.log('[useCoachRequests] 🔴 rejectRequest called:', { requestId, user: !!user });
    
    if (!user) {
      console.log('[useCoachRequests] 🔴 No user logged in');
      return { error: 'No user logged in' };
    }

    // Prevent multiple simultaneous operations on the same request
    if (processingRequests.has(requestId)) {
      console.log('[useCoachRequests] 🔴 Request already processing:', requestId);
      return { error: 'Request is already being processed' };
    }

    setProcessingRequests(prev => new Set(prev).add(requestId));

    // Optimistic update - immediately update UI
    const originalRequests = [...requests];
    setRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, status: 'rejected' as const, responded_at: new Date().toISOString(), responded_by: user.id }
        : req
    ));

    try {
      console.log('[useCoachRequests] 🔴 Updating request status to rejected...');
      
      // Update without retry to avoid constraint issues
      const { error } = await supabase
        .from('coach_requests')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString(),
          responded_by: user.id,
        })
        .eq('id', requestId)
        .eq('status', 'pending'); // Only update if still pending

      if (error) {
        console.error('[useCoachRequests] 🔴 Update error:', error);
        throw error;
      }

      console.log('[useCoachRequests] 🔴 Request status updated to rejected');

      // Notification removed due to RLS policy restrictions

      // Don't reload here - let real-time subscriptions handle it
      // This prevents infinite loops
      console.log('[useCoachRequests] 🔴 Reject request completed successfully');
      return { error: null };
    } catch (err: any) {
      console.error('[useCoachRequests] 🔴 Error rejecting request:', err);
      
      // Revert optimistic update on failure
      setRequests(originalRequests);
      
      return { error: err.message || 'Failed to reject request. Please try again.' };
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Get pending requests count for badges
  const getPendingRequestsCount = () => {
    return requests.filter(req => req.status === 'pending').length;
  };

  // Check if user has pending request with specific coach
  const hasPendingRequestWith = (coachId: string) => {
    return requests.some(req => 
      req.coach_id === coachId && 
      req.status === 'pending'
    );
  };

  // Set up real-time subscription for coach requests
  useEffect(() => {
    if (!user) return;

    console.log('[useCoachRequests] Setting up real-time subscription for user:', user.id);

    const channel = supabase
      .channel('coach_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coach_requests',
          filter: `client_user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[useCoachRequests] Real-time update received:', payload);
          // Reload requests when there's a change
          loadUserRequests();
        }
      )
      .subscribe();

    return () => {
      console.log('[useCoachRequests] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Set up real-time subscription for coach requests (coach perspective)
  useEffect(() => {
    if (!coachData?.id) return;

    console.log('[useCoachRequests] Setting up real-time subscription for coach:', coachData.id);

    const channel = supabase
      .channel('coach_requests_coach_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coach_requests',
          filter: `coach_id=eq.${coachData.id}`,
        },
        (payload) => {
          console.log('[useCoachRequests] Real-time update received for coach:', payload);
          // Reload requests when there's a change
          loadCoachRequests();
        }
      )
      .subscribe();

    return () => {
      console.log('[useCoachRequests] Cleaning up coach real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [coachData?.id]);

  return {
    requests,
    loading,
    error,
    processingRequests,
    sendCoachRequest,
    acceptRequest,
    rejectRequest,
    loadCoachRequests,
    loadUserRequests,
    getPendingRequestsCount,
    hasPendingRequestWith,
  };
};