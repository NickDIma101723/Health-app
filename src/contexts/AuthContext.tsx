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
      console.log('[checkPersistedMode] Checking persisted mode:', savedMode);

      if (savedMode === 'coach') {
        console.log('[checkPersistedMode] 🔄 Restoring COACH mode from AsyncStorage');
        setCurrentMode('coach');
        setIsCoach(true);
        return true; // Indicate coach mode was restored
      } else if (savedMode === 'client') {
        console.log('[checkPersistedMode] 👤 Setting to CLIENT mode from AsyncStorage');
        setCurrentMode('client');
        setIsCoach(false);
        return false; // Indicate client mode was restored
      } else {
        console.log('[checkPersistedMode] No persisted mode found');
        return null; // No persisted mode
      }
    } catch (error) {
      console.error('[checkPersistedMode] Error checking persisted mode:', error);
      return null; // Error, no persisted mode
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

        // First, check if there's a persisted mode
        const persistedMode = await checkPersistedMode();
        console.log('[checkIsCoach] Persisted mode result:', persistedMode);

        // Always check the database to ensure accuracy
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

          // If no persisted mode was found, default coaches to coach mode
          if (persistedMode === null) {
            console.log('[checkIsCoach] No persisted mode, defaulting coach to COACH mode');
            setCurrentMode('coach');
            setIsCoach(true);

            // Save the default coach mode
            try {
              await AsyncStorage.setItem('user_mode', 'coach');
              console.log('[checkIsCoach] ✅ Saved default coach mode to AsyncStorage');
            } catch (error) {
              console.error('[checkIsCoach] Failed to save default coach mode:', error);
            }
          } else {
            // Use the persisted mode
            console.log('[checkIsCoach] Using persisted mode for coach:', persistedMode ? 'coach' : 'client');
            setIsCoach(persistedMode);
            setCurrentMode(persistedMode ? 'coach' : 'client');
          }
        } else {
          console.log('[checkIsCoach] ❌ User CANNOT be a coach - error:', error?.message);
          setCanBeCoach(false);
          setCoachData(null);

          // User is not a coach, so they should be in client mode
          setCurrentMode('client');
          setIsCoach(false);

          // Clear any incorrect persisted coach mode
          if (persistedMode === true) {
            console.log('[checkIsCoach] Clearing incorrect persisted coach mode');
            try {
              await AsyncStorage.removeItem('user_mode');
            } catch (error) {
              console.error('[checkIsCoach] Failed to clear persisted mode:', error);
            }
          }
        }
      } catch (err) {
        console.error('[checkIsCoach] 🔥 Exception during coach check:', err);
        setIsCoach(false);
        setCoachData(null);
        setCanBeCoach(false);
        setCurrentMode('client');
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
    try {
      // Validate input before sending to Supabase
      const trimmedEmail = email?.trim();
      const trimmedPassword = password?.trim();

      if (!trimmedEmail || !trimmedPassword) {
        console.error('[Auth] Empty credentials provided');
        return { 
          error: { 
            message: 'Email and password are required',
            name: 'ValidationError',
            status: 400
          } as any
        };
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        console.error('[Auth] Invalid email format');
        return { 
          error: { 
            message: 'Please enter a valid email address',
            name: 'ValidationError',
            status: 400
          } as any
        };
      }

      if (trimmedPassword.length < 6) {
        console.error('[Auth] Password too short');
        return { 
          error: { 
            message: 'Password must be at least 6 characters',
            name: 'ValidationError',
            status: 400
          } as any
        };
      }

      console.log('[Auth] Attempting sign in with email:', trimmedEmail);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (error) {
        console.error('[Auth] Sign in error:', error);
        
        // Provide more specific error messages
        if (error.message.includes('Invalid login credentials')) {
          return { 
            error: { 
              ...error,
              message: 'Invalid email or password. Please check your credentials and try again.'
            }
          };
        }
        
        if (error.message.includes('Email not confirmed')) {
          return { 
            error: { 
              ...error,
              message: 'Please verify your email address before signing in. Check your inbox for the confirmation link.'
            }
          };
        }

        return { error };
      }

      console.log('[Auth] ✅ Sign in successful');
      return { error: null };
      
    } catch (err: any) {
      console.error('[Auth] Unexpected error during sign in:', err);
      return { 
        error: { 
          message: err?.message || 'An unexpected error occurred during sign in. Please try again.',
          name: 'UnexpectedError',
          status: 500
        } as any
      };
    }
  };

  const signOut = async () => {
    // Clear React state
    setUser(null);
    setSession(null);
    setIsCoach(false);
    setCoachData(null);
    setCurrentMode(null);
    setCanBeCoach(false);
    lastCoachCheck.current = null;
    
    // Clear all auth-related storage
    try {
      const keys = [
        'userMode',
        'lastModeCheck',
        'supabase.auth.token',
        'sb-fkmthgmwrvzgygdqoqvq-auth-token', // Supabase stores tokens with project reference
      ];
      
      await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
      
      // Also try to clear all Supabase keys
      const allKeys = await AsyncStorage.getAllKeys();
      const supabaseKeys = allKeys.filter(key => 
        key.startsWith('supabase.') || key.startsWith('sb-')
      );
      await Promise.all(supabaseKeys.map(key => AsyncStorage.removeItem(key)));
      
      console.log('[Auth] ✅ Successfully signed out and cleared storage');
    } catch (storageError) {
      console.warn('[Auth] Error clearing AsyncStorage:', storageError);
    }
  };

  const refreshCoachStatus = async () => {
    // Clear cache and force a fresh check
    lastCoachCheck.current = null;
    await checkIsCoach();
  };

  const switchToCoachMode = async () => {
    console.log('[AuthContext] 🔄 switchToCoachMode called - canBeCoach:', canBeCoach, 'coachData:', !!coachData);
    
    // If not already a coach, force refresh first
    if (!canBeCoach || !coachData) {
      console.log('[AuthContext] ❌ Cannot switch to coach mode yet - refreshing coach status...');
      await refreshCoachStatus();
      
      // Wait for state to update after refresh
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Check fresh data from database directly
    if (!user) {
      throw new Error('No user logged in');
    }
    
    const { data: freshCoachData, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error || !freshCoachData) {
      console.log('[AuthContext] ❌ Database check failed - user is not a coach');
      throw new Error('You are not registered as a coach. Please complete the coach registration process first.');
    }
    
    // Update local state with fresh data
    console.log('[AuthContext] ✅ Fresh coach data confirmed, switching to coach mode');
    setCanBeCoach(true);
    setCoachData(freshCoachData);
    setCurrentMode('coach');
    setIsCoach(true);

    try {
      await AsyncStorage.setItem('user_mode', 'coach');
      console.log('[AuthContext] ✅ Coach mode persisted to AsyncStorage');
    } catch (error) {
      console.error('[AuthContext] ❌ Failed to persist coach mode:', error);
    }

    console.log('[AuthContext] ✅ Coach mode switch completed - isCoach:', true, 'currentMode: coach');
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
