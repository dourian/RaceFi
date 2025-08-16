# Supabase Auth Integration Setup

This guide will help you set up Supabase authentication with your RaceFi mobile app.

## Prerequisites

1. A Supabase project (create one at [supabase.com](https://supabase.com))
2. Node.js and npm installed
3. Expo CLI installed

## Setup Steps

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Create a new project
3. Note down your project URL and anon key

### 2. Configure Environment Variables

Create a `.env` file in your `mobile/` directory:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the values with your actual Supabase project credentials.

### 3. Update Configuration

Edit `mobile/lib/config.ts` and replace the placeholder values with your actual Supabase credentials:

```typescript
export const SUPABASE_CONFIG = {
  url: "https://your-project-id.supabase.co",
  anonKey: "your-actual-anon-key",
};
```

### 4. Configure Supabase Auth Settings

In your Supabase dashboard:

1. Go to Authentication > Settings
2. Configure your site URL (for development, use your Expo development URL)
3. Add redirect URLs if needed
4. Configure email templates if desired

### 5. Install Dependencies

The required dependencies are already installed:

```bash
npm install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

### 6. Run the App

```bash
npm start
```

## Features Implemented

- **Authentication Context**: Manages auth state throughout the app
- **Sign In/Sign Up Screens**: User authentication forms
- **Auth Wrapper**: Protects routes requiring authentication
- **Profile Management**: User profile display and sign out
- **Session Persistence**: Auth state persists across app restarts

## How It Works

1. **AuthProvider**: Wraps the entire app and manages authentication state
2. **AuthWrapper**: Shows auth screens when not authenticated, main app when authenticated
3. **Supabase Client**: Handles all authentication operations with Supabase
4. **AsyncStorage**: Persists authentication tokens locally

## Customization

You can customize the authentication flow by:

- Modifying the auth screens in `mobile/components/`
- Adding additional auth providers (Google, Apple, etc.)
- Customizing the user profile fields
- Adding password reset functionality

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables for sensitive configuration
- The anon key is safe to use in client-side code
- Consider implementing additional security measures for production

## Troubleshooting

- **JSX errors**: Make sure your TypeScript configuration is correct
- **Import errors**: Check that all dependencies are properly installed
- **Auth not working**: Verify your Supabase credentials and project settings
- **Build errors**: Clear your Expo cache with `expo start -c`
