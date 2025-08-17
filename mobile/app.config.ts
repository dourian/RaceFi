import 'dotenv/config';
import { ExpoConfig } from 'expo/config';

export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  name: 'RaceFi',
  slug: 'racefi',
  owner: 'mastersuperd',
  extra: {
    ...(config.extra || {}),
    eas: {
      projectId: '4fe0683b-afd8-4aae-85e3-af84b0649d46',
    },
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});

