import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isCoach: boolean;
  coachData: any | null;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  checkIsCoach: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [coachData, setCoachData] = useState<any | null>(null);
  const isRegistering = useRef(false);

  const checkIsCoach = async () => {
    if (!user) {
      console.log('[checkIsCoach] No user, setting isCoach to false');
      setIsCoach(false);
      setCoachData(null);
      return;
    }

    console.log('[checkIsCoach] Checking coach status for user:', user.id);
    try {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      console.log('[checkIsCoach] Query result:', { data, error });

      if (!error && data) {
        console.log('[checkIsCoach] ✅ User IS a coach:', data);
        setIsCoach(true);
        setCoachData(data);
      } else {
        console.log('[checkIsCoach] ❌ User is NOT a coach or error occurred:', error);
        setIsCoach(false);
        setCoachData(null);
      }
    } catch (err) {
      console.error('[checkIsCoach] 🔥 Exception during coach check:', err);
      setIsCoach(false);
      setCoachData(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth state changed:', event, 'isRegistering:', isRegistering.current);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (event === 'SIGNED_IN' && session?.user && !isRegistering.current) {
        console.log('[AuthContext] SIGNED_IN event - checking for existing profile');
        ensureProfileExists(session.user);
      }
      
      if (event === 'SIGNED_IN' && isRegistering.current) {
        console.log('[AuthContext] Registration completed, resetting flag');
        isRegistering.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      checkIsCoach();
    } else {
      setIsCoach(false);
      setCoachData(null);
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
        console.log('[ensureProfileExists] No profile found, creating one for user:', currentUser.id);
        
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
        } else {
          console.log('[ensureProfileExists] ✅ Profile created successfully:', newProfile);
        }
      } else {
        console.log('[ensureProfileExists] ✅ Profile already exists');
      }
    } catch (error) {
      console.error('[ensureProfileExists] Unexpected error:', error);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      isRegistering.current = true;
      console.log('[signUp] Starting registration, setting isRegistering flag');
      
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
    }
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
    signUp,
    signIn,
    signOut,
    resetPassword,
    checkIsCoach,
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
