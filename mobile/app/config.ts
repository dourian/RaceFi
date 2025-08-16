import Constants from "expo-constants";

// Read from process.env (EXPO_PUBLIC_*) with a fallback to app.config.ts extra
const extra = (Constants?.expoConfig?.extra || {}) as Record<string, any>;
const SUPABASE_URL =
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
  (extra.EXPO_PUBLIC_SUPABASE_URL as string | undefined);
const SUPABASE_ANON_KEY =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  (extra.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined);

// Supabase Configuration
// These should be set via EAS environment variables or .env loaded via app.config.ts
export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};

// You can also add other app configuration here
export const APP_CONFIG = {
  appName: "RaceFi",
  version: "1.0.0",
};

export default SUPABASE_CONFIG;

export const API_URL = "http://127.0.0.1:8001";
