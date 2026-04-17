import type { ExpoConfig } from 'expo/config';
import appJson from './app.json';

const baseConfig = appJson.expo as ExpoConfig;

const config: ExpoConfig = {
  ...baseConfig,
  extra: {
    ...baseConfig.extra,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default config;
