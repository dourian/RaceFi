// Supabase Configuration
// These should be set via EAS environment variables
export const SUPABASE_CONFIG = {
  url:
    process.env.EXPO_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
};

// You can also add other app configuration here
export const APP_CONFIG = {
  appName: "RaceFi",
  version: "1.0.0",
};

export default SUPABASE_CONFIG;

export const API_URL = "http://127.0.0.1:8001";
