// Supabase Configuration
// Replace these with your actual Supabase credentials
export const SUPABASE_CONFIG = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL",
  anonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY",
};

// You can also add other app configuration here
export const APP_CONFIG = {
  appName: "RaceFi",
  version: "1.0.0",
};
