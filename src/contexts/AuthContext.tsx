import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isCoach: boolean;
  coachData: any | null;
  currentMode: 'client' | 'coach' | null;
  canBeCoach: boolean;
  coachStatusLoaded: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  checkIsCoach: () => Promise<void>;
  refreshCoachStatus: () => Promise<void>;
  switchToCoachMode: () => void;
  switchToClientMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [coachData, setCoachData] = useState<any | null>(null);
  const [currentMode, setCurrentMode] = useState<'client' | 'coach' | null>(null);
  const [canBeCoach, setCanBeCoach] = useState(false);
  const [coachStatusLoaded, setCoachStatusLoaded] = useState(false);
  const isRegistering = useRef(false);
  const lastCoachCheck = useRef<{ userId: string; timestamp: number; promise?: Promise<void> } | null>(null);

  const checkPersistedMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('user_mode');
      console.log('[checkIsCoach] Checking persisted mode:', savedMode);
      
      if (savedMode === 'coach') {
        console.log('[checkIsCoach] 🔄 Restoring COACH mode from AsyncStorage');
        setCurrentMode('coach');
        setIsCoach(true);
      } else if (savedMode === 'client') {
        console.log('[checkIsCoach] 👤 Setting to CLIENT mode from AsyncStorage');
        setCurrentMode('client');
        setIsCoach(false);
      } else {
        // No persisted mode, default based on canBeCoach
        if (canBeCoach) {
          console.log('[checkIsCoach] No persisted mode, defaulting coach to COACH mode');
          setCurrentMode('coach');
          setIsCoach(true);
          // Save the default coach mode
          try {
            await AsyncStorage.setItem('user_mode', 'coach');
          } catch (error) {
            console.error('[checkIsCoach] Failed to save default coach mode:', error);
          }
        } else {
          console.log('[checkIsCoach] No persisted mode, defaulting to CLIENT mode');
          setCurrentMode('client');
          setIsCoach(false);
        }
      }
    } catch (error) {
      console.error('[checkIsCoach] Error checking persisted mode:', error);
      // On error, default based on canBeCoach
      if (canBeCoach) {
        setCurrentMode('coach');
        setIsCoach(true);
      } else {
        setCurrentMode('client');
        setIsCoach(false);
      }
    }
  };

  const checkIsCoach = async () => {
    if (!user) {
      setIsCoach(false);
      setCoachData(null);
      setCoachStatusLoaded(true);
      return;
    }

    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache (increased for stability)

    // Check if we have recent data for this user
    if (
      lastCoachCheck.current &&
      lastCoachCheck.current.userId === user.id &&
      now - lastCoachCheck.current.timestamp < CACHE_DURATION
    ) {
      return;
    }

    // Check if there's already a request in progress for this user
    if (
      lastCoachCheck.current &&
      lastCoachCheck.current.userId === user.id &&
      lastCoachCheck.current.promise
    ) {
      try {
        await lastCoachCheck.current.promise;
      } catch (err) {
        console.error('[checkIsCoach] Error in pending request:', err);
      }
      return;
    }
    
    const requestPromise = (async () => {
      try {
        console.log('[checkIsCoach] Checking coach status for user:', user.id);
        const { data, error } = await supabase
          .from('coaches')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!error && data) {
          console.log('[checkIsCoach] ✅ User CAN be a coach:', data);
          setCanBeCoach(true);
          setCoachData(data);
        } else {
          console.log('[checkIsCoach] ❌ User CANNOT be a coach - error:', error?.message);
          setCanBeCoach(false);
          setCoachData(null);
        }

        // Now check persisted mode
        await checkPersistedMode();
      } catch (err) {
        console.error('[checkIsCoach] 🔥 Exception during coach check:', err);
        setIsCoach(false);
        setCoachData(null);
        setCanBeCoach(false);
        // Still check persisted mode
        await checkPersistedMode();
      } finally {
        // Clear the promise reference but keep the cache timestamp
        if (lastCoachCheck.current) {
          lastCoachCheck.current.promise = undefined;
        }
        setCoachStatusLoaded(true);
      }
    })();

    // Update cache with current request
    lastCoachCheck.current = {
      userId: user.id,
      timestamp: now,
      promise: requestPromise
    };

    await requestPromise;
  };

  // Load persisted mode on startup
  useEffect(() => {
    const loadPersistedMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('user_mode');
        console.log('[AuthContext] 🔄 Loading persisted mode from AsyncStorage:', savedMode);
        if (savedMode && (savedMode === 'coach' || savedMode === 'client')) {
          console.log('[AuthContext] ✅ Setting initial mode to:', savedMode);
          setCurrentMode(savedMode as 'coach' | 'client');
          // Note: isCoach will be set during coach verification based on this mode
        }
      } catch (error) {
        console.error('[AuthContext] ❌ Failed to load persisted mode:', error);
      }
    };

    loadPersistedMode();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (event === 'SIGNED_IN' && session?.user && !isRegistering.current) {
        ensureProfileExists(session.user);
      }
      
      if (event === 'SIGNED_IN' && isRegistering.current) {
        isRegistering.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Add debounce for coach checking to prevent rapid state switches
  useEffect(() => {
    if (user) {
      // Check if we already have recent data for this user
      const now = Date.now();
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      
      const hasRecentData = lastCoachCheck.current &&
        lastCoachCheck.current.userId === user.id &&
        now - lastCoachCheck.current.timestamp < CACHE_DURATION;
      
      if (!hasRecentData) {
        // Only debounce if we don't have recent data
        const timeoutId = setTimeout(() => {
          checkIsCoach();
        }, 300); // Reduced delay
        
        return () => clearTimeout(timeoutId);
      }
      // If we have recent data, don't check again
    } else {
      setIsCoach(false);
      setCoachData(null);
      setCoachStatusLoaded(false);
    }
  }, [user]);

  const ensureProfileExists = async (currentUser: any) => {
    if (!currentUser) return;

    try {
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (checkError) {
        console.error('[ensureProfileExists] Error checking profile:', checkError);
        return;
      }

      if (!existingProfile) {
        const userName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User';
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: currentUser.id,
            full_name: userName,
            fitness_level: 'beginner',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
          console.error('[ensureProfileExists] Error creating profile:', createError);
        }
      }
    } catch (error) {
      console.error('[ensureProfileExists] Unexpected error:', error);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      isRegistering.current = true;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            full_name: name,
          },
        },
      });
      
      if (error) {
        console.error('Signup error:', error);
        isRegistering.current = false;
        return { error };
      }
      
      if (!data.user) {
        console.error('No user data returned from signup');
        isRegistering.current = false;
        return { 
          error: { 
            message: 'Registration failed - no user data received',
            name: 'NoUserData',
            status: 500
          } as any
        };
      }

      console.log('User created successfully:', data.user.id);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('Creating profile for user:', data.user.id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          full_name: name,
          fitness_level: 'beginner',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (profileError) {
        console.error('Profile creation error:', profileError);
        console.error('Profile error details:', JSON.stringify(profileError, null, 2));
        isRegistering.current = false;
        
        if (profileError.code === '42501' || profileError.message?.includes('policy')) {
          return { 
            error: { 
              message: 'Account created but profile setup blocked by security policies. Please contact support with error code: RLS_BLOCK',
              name: 'ProfileCreationError',
              status: 500
            } as any
          };
        }
        
        return { 
          error: { 
            message: `Account created but profile setup failed: ${profileError.message}`,
            name: 'ProfileCreationError',
            status: 500
          } as any
        };
      }
      
      console.log('Profile created successfully:', profileData);
      
      console.log('Creating weekly goals for user:', data.user.id);
      const weekStart = new Date().toISOString().split('T')[0];
      const { data: goalsData, error: goalsError } = await supabase
        .from('weekly_goals')
        .upsert({
          user_id: data.user.id,
          week_start_date: weekStart,
          workouts_target: 3,
          workouts_current: 0,
          meals_target: 21,
          meals_current: 0,
          meditation_target: 7,
          meditation_current: 0,
          habits_target: 7,
          habits_current: 0,
        }, {
          onConflict: 'user_id,week_start_date',
          ignoreDuplicates: false,
        })
        .select()
        .single();
      
      if (goalsError) {
        console.error('Weekly goals creation error:', goalsError);
        console.error('Goals error details:', JSON.stringify(goalsError, null, 2));
      } else {
        console.log('Weekly goals created/updated successfully:', goalsData);
      }
      
      console.log('Signup process completed successfully');
      return { error: null };
      
    } catch (err) {
      console.error('Unexpected error during signup:', err);
      return { 
        error: { 
          message: 'An unexpected error occurred during registration',
          name: 'UnexpectedError',
          status: 500
        } as any
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setIsCoach(false);
      setCoachData(null);
      setCurrentMode(null);
      setCanBeCoach(false);
      lastCoachCheck.current = null;
    }
  };

  const refreshCoachStatus = async () => {
    // Clear cache and force a fresh check
    lastCoachCheck.current = null;
    await checkIsCoach();
  };

  const switchToCoachMode = async () => {
    console.log('[AuthContext] 🔄 switchToCoachMode called - canBeCoach:', canBeCoach, 'coachData:', !!coachData);
    if (canBeCoach && coachData) {
      console.log('[AuthContext] 🔄 Switching to COACH mode - setting currentMode=coach, isCoach=true');
      setCurrentMode('coach');
      setIsCoach(true);
      
      // Persist coach mode to AsyncStorage
      try {
        await AsyncStorage.setItem('user_mode', 'coach');
        console.log('[AuthContext] ✅ Coach mode persisted to AsyncStorage');
      } catch (error) {
        console.error('[AuthContext] ❌ Failed to persist coach mode:', error);
      }
      
      console.log('[AuthContext] ✅ Coach mode switch completed - isCoach:', true, 'currentMode: coach');
    } else {
      console.log('[AuthContext] ❌ Cannot switch to coach mode - user is not a coach');
      console.log('[AuthContext] Debug state:', { canBeCoach, coachData: !!coachData, currentMode });
    }
  };

  const switchToClientMode = async () => {
    console.log('[AuthContext] 🔄 switchToClientMode called - switching to CLIENT mode');
    console.log('[AuthContext] Current state before switch:', { currentMode, isCoach, canBeCoach });
    setCurrentMode('client');
    setIsCoach(false);
    
    // Persist client mode to AsyncStorage
    try {
      await AsyncStorage.setItem('user_mode', 'client');
      console.log('[AuthContext] ✅ Client mode persisted to AsyncStorage');
    } catch (error) {
      console.error('[AuthContext] ❌ Failed to persist client mode:', error);
    }
    
    console.log('[AuthContext] ✅ Client mode switch completed - isCoach:', false, 'currentMode: client');
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'myapp://reset-password',
    });
    
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    isCoach,
    coachData,
    currentMode,
    canBeCoach,
    coachStatusLoaded,
    signUp,
    signIn,
    signOut,
    resetPassword,
    checkIsCoach,
    refreshCoachStatus,
    switchToCoachMode,
    switchToClientMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
