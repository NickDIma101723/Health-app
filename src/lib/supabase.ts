import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
  console.error('⚠️ SUPABASE CONFIGURATION ERROR:');
  console.error('Please configure your Supabase credentials in the .env file');
  console.error('1. Copy .env.example to .env');
  console.error('2. Add your Supabase URL and ANON_KEY from https://supabase.com/dashboard');
}

if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key-here') {
  console.error('⚠️ SUPABASE ANON_KEY is not configured');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);