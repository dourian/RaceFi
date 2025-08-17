import Constants from "expo-constants";
import { Platform } from "react-native";

// Read from process.env (EXPO_PUBLIC_*) with a fallback to app.config.ts extra
const extra = (Constants?.expoConfig?.extra || {}) as Record<string, any>;
const SUPABASE_URL =
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
  (extra.EXPO_PUBLIC_SUPABASE_URL as string | undefined);
const SUPABASE_ANON_KEY =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  (extra.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined);

// Pick a sensible default API URL per runtime (simulator/emulator/device)
const DEFAULT_API_URL = (() => {
  // Android emulator can’t reach localhost directly; use 10.0.2.2
  if (Platform.OS === "android") return "http://10.0.2.2:3001";
  // iOS simulator can use localhost
  return "http://localhost:3001";
})();

const API_URL_ENV =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  (extra.EXPO_PUBLIC_API_URL as string | undefined) ||
  DEFAULT_API_URL;

// Separate token backend URL (optional); falls back to API_URL
const TOKEN_API_URL_ENV =
  (process.env.EXPO_PUBLIC_TOKEN_API_URL as string | undefined) ||
  (extra.EXPO_PUBLIC_TOKEN_API_URL as string | undefined) ||
  API_URL_ENV;

// Onramp configuration (public app-safe values)
export const ONRAMP_CONFIG = {
  CDP_PROJECT_ID:
    (process.env.EXPO_PUBLIC_CDP_PROJECT_ID as string | undefined) ||
    (extra.EXPO_PUBLIC_CDP_PROJECT_ID as string | undefined) ||
    "",
  DEFAULT_CHAIN:
    (process.env.EXPO_PUBLIC_ONRAMP_CHAIN as string | undefined) ||
    (extra.EXPO_PUBLIC_ONRAMP_CHAIN as string | undefined) ||
    "base",
  DEFAULT_ASSET:
    (process.env.EXPO_PUBLIC_ONRAMP_ASSET as string | undefined) ||
    (extra.EXPO_PUBLIC_ONRAMP_ASSET as string | undefined) ||
    "USDC",
  DEFAULT_REDIRECT_URL:
    (process.env.EXPO_PUBLIC_ONRAMP_REDIRECT_URL as string | undefined) ||
    (extra.EXPO_PUBLIC_ONRAMP_REDIRECT_URL as string | undefined) ||
    "racefi://success",
  DEFAULT_DESTINATION:
    (process.env.EXPO_PUBLIC_ONRAMP_DESTINATION_ADDRESS as string | undefined) ||
    (extra.EXPO_PUBLIC_ONRAMP_DESTINATION_ADDRESS as string | undefined) ||
    "",
};

// Supabase Configuration
// These should be set via EAS environment variables or .env loaded via app.config.ts
export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};

// App configuration
export const APP_CONFIG = {
  appName: "RaceFi",
  version: "1.0.0",
};

export default SUPABASE_CONFIG;

export const API_URL = API_URL_ENV || "";
export const TOKEN_API_URL = TOKEN_API_URL_ENV || API_URL;
