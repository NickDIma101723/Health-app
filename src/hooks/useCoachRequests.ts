import { useState, useEffect } from 'react';
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

    setLoading(true);
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

    setLoading(true);
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

      // Check if request already exists with retry
      const existingRequest = await retryOperation(async () => {
        const { data, error } = await supabase
          .from('coach_requests')
          .select('*')
          .eq('client_user_id', user.id)
          .eq('coach_id', coachId)
          .eq('status', 'pending')
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
          throw error;
        }
        return data;
      }, 'Check Existing Request');

      if (existingRequest) {
        return { error: 'You already have a pending request with this coach' };
      }

      // Send the request with retry
      const requestData = await retryOperation(async () => {
        const { data, error } = await supabase
          .from('coach_requests')
          .insert({
            client_user_id: user.id,
            coach_id: coachId,
            message: message?.trim() || null,
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }, 'Send Coach Request');

      console.log('Coach request sent successfully:', requestData);

      // Create notification for the coach with retry
      try {
        const coachProfile = await retryOperation(async () => {
          const { data, error } = await supabase
            .from('coaches')
            .select('user_id, full_name')
            .eq('id', coachId)
            .single();

          if (error) throw error;
          return data;
        }, 'Get Coach Profile');

        if (coachProfile?.user_id) {
          await retryOperation(async () => {
            const { error: notificationError } = await supabase
              .from('notifications')
              .insert({
                user_id: coachProfile.user_id,
                title: 'New Coaching Request! 📬',
                message: `${user.user_metadata?.full_name || 'A client'} has sent you a coaching request${message ? ' with a message' : ''}. Check your requests to respond.`,
                notification_type: 'message',
                is_read: false,
              });

            if (notificationError) throw notificationError;
          }, 'Create Coach Notification');
        }
      } catch (notificationError) {
        // Don't fail the whole operation if notification fails
        console.warn('Failed to create notification for coach:', notificationError);
      }

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
      
      await retryOperation(async () => {
        const { error: updateError } = await supabase
          .from('coach_requests')
          .update({
            status: 'accepted',
            responded_at: new Date().toISOString(),
            responded_by: user.id,
          })
          .eq('id', requestId);

        if (updateError) throw updateError;
      }, 'Accept Request Update');

      console.log('[useCoachRequests] 🟢 Request status updated successfully');

      // Get the request details
      console.log('[useCoachRequests] 🟢 Getting request details...');
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        throw new Error('Request not found in local state');
      }
      
      console.log('[useCoachRequests] 🟢 Request found:', request);

      // Create coach-client assignment
      console.log('[useCoachRequests] 🟢 Creating coach-client assignment...');
      await retryOperation(async () => {
        const { error: assignmentError } = await supabase
          .from('coach_client_assignments')
          .insert({
            coach_id: coachData.id,
            client_user_id: request.client_user_id,
            is_active: true,
            assigned_by: user.id,
            notes: 'Assigned via coach request approval',
          });

        if (assignmentError) throw assignmentError;
      }, 'Create Assignment');

      console.log('[useCoachRequests] 🟢 Assignment created successfully');

      // Create notification for the client
      console.log('[useCoachRequests] 🟢 Creating notification...');
      try {
        await retryOperation(async () => {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: request.client_user_id,
              title: 'Coach Request Accepted! 🎉',
              message: `${coachData.full_name || 'Your coach'} has accepted your coaching request. You can now start your fitness journey together!`,
              notification_type: 'message',
              is_read: false,
            });

          if (notificationError) throw notificationError;
        }, 'Create Notification');
        
        console.log('[useCoachRequests] 🟢 Notification created successfully');
      } catch (notificationError) {
        // Don't fail the whole operation if notification fails
        console.warn('[useCoachRequests] 🟢 Notification creation failed, but request was accepted:', notificationError);
      }

      // Reload requests to get fresh data
      console.log('[useCoachRequests] 🟢 Reloading requests...');
      await loadCoachRequests();

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
      
      await retryOperation(async () => {
        const { error } = await supabase
          .from('coach_requests')
          .update({
            status: 'rejected',
            responded_at: new Date().toISOString(),
            responded_by: user.id,
          })
          .eq('id', requestId);

        if (error) throw error;
      }, 'Reject Request Update');

      console.log('[useCoachRequests] 🔴 Request status updated to rejected');

      // Get the request details for notification
      console.log('[useCoachRequests] 🔴 Getting request details for notification...');
      const request = requests.find(r => r.id === requestId);
      
      if (request) {
        console.log('[useCoachRequests] 🔴 Creating rejection notification...');
        try {
          await retryOperation(async () => {
            const { error: notificationError } = await supabase
              .from('notifications')
              .insert({
                user_id: request.client_user_id,
                title: 'Coach Request Update',
                message: `Thank you for your interest. Unfortunately, we are unable to accept your coaching request at this time. Feel free to try again later or explore other coaches.`,
                notification_type: 'message',
                is_read: false,
              });

            if (notificationError) throw notificationError;
          }, 'Create Rejection Notification');
          
          console.log('[useCoachRequests] 🔴 Notification created successfully');
        } catch (notificationError) {
          // Don't fail the whole operation if notification fails
          console.warn('[useCoachRequests] 🔴 Notification creation failed, but request was rejected:', notificationError);
        }
      }

      // Reload requests to get fresh data
      console.log('[useCoachRequests] 🔴 Reloading requests...');
      await loadCoachRequests();

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