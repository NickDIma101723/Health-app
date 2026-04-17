import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const expoExtra =
  (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined) ||
  (Constants.manifest2?.extra as Record<string, string | undefined> | undefined) ||
  {};

const rawSupabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
  expoExtra.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
  expoExtra.SUPABASE_URL?.trim() ||
  '';
const rawSupabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  expoExtra.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  expoExtra.SUPABASE_ANON_KEY?.trim() ||
  '';

const isPlaceholder = (value: string) => {
  const lower = value.toLowerCase();
  return (
    !value ||
    lower.includes('your-project-id') ||
    lower.includes('your_supabase_url') ||
    lower.includes('your-anon-key') ||
    lower.includes('your_supabase_anon_key')
  );
};

const hasValidUrl = !isPlaceholder(rawSupabaseUrl);
const hasValidAnonKey = !isPlaceholder(rawSupabaseAnonKey);

if (!hasValidUrl) {
  console.error('⚠️ SUPABASE CONFIGURATION ERROR:');
  console.error('Please configure your Supabase credentials in the .env file');
  console.error('1. Copy .env.example to .env');
  console.error('2. Add your Supabase URL and ANON_KEY from https://supabase.com/dashboard');
} else {
  console.log('[Supabase] ✅ Connected to:', rawSupabaseUrl);
}

if (!hasValidAnonKey) {
  console.error('⚠️ SUPABASE ANON_KEY is not configured');
}

// Keep app startup resilient even when env vars are missing.
// This avoids a hard crash from createClient during module import.
const supabaseUrl = hasValidUrl
  ? rawSupabaseUrl
  : 'https://placeholder.supabase.co';
const supabaseAnonKey = hasValidAnonKey
  ? rawSupabaseAnonKey
  : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});