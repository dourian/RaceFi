# App Directory

The main application code using Expo Router for file-based navigation. This directory contains all screens, contexts, authentication, and app-level configuration.

## Structure

```
app/
├── (tabs)/              # Tab-based navigation screens
├── auth/                # Authentication screens and wrapper
├── challenge/           # Challenge-specific screens
├── contexts/            # React Context providers for state management
├── lib/                 # Core libraries (auth, database, mock data)
├── _layout.tsx          # Root layout with providers and navigation
├── config.ts            # App configuration (environment variables)
├── index.tsx            # Entry point that redirects to tabs
├── theme.ts             # App-wide styling and theme
└── [other screens]      # Additional screens (record, completion, etc.)
```

## Core Files

### `_layout.tsx`
- Root layout component that wraps the entire app
- Sets up context providers (AuthProvider, LocationProvider, BalanceProvider, ChallengeProvider)
- Configures navigation styling and header behavior
- Defines custom back button component

### `index.tsx`
- App entry point
- Redirects to the main tab navigation `/(tabs)`

### `config.ts`
- Centralized configuration for environment variables
- Supabase connection settings using EAS environment variables
- App metadata (name, version)

### `theme.ts`
- App-wide styling constants
- Typography definitions
- Color palette
- Consistent design tokens

## Navigation Structure (Tabs)

The `(tabs)` directory contains the main app screens accessible via tab navigation:

1. **index** (Browse) - Challenge browsing and discovery
2. **upload** - File/data upload functionality  
3. **trophies** - Achievement and trophy display
4. **profile** - User profile and settings
5. **map_test** - Development screen for testing map functionality

## Authentication System

### `auth/` directory
- **sign-in.tsx**: Email/password login with guest option
- **sign-up.tsx**: User registration
- **profile.tsx**: Profile management within auth flow
- **auth-wrapper.tsx**: Authentication state wrapper

### `lib/auth-context.tsx`
- React Context for authentication state management
- Supabase auth integration
- Handles sign in/up/out operations
- Guest mode support

## Context Providers

### `contexts/challengeContext.tsx`
- Manages user challenge participation state
- Handles joining, starting, completing challenges
- Winner determination and reward distribution
- Statistics calculation
- Challenge simulation for development

### `contexts/locationContext.tsx`
- GPS location tracking for run recording
- Location permissions management
- Real-time coordinate collection during runs

### `contexts/balanceContext.tsx`
- User wallet/balance management
- USDC balance tracking
- Transaction history
- Staking and reward operations

## Screen Types

### Challenge Screens
- **challenge/[id].tsx**: Dynamic route for individual challenge details
- Challenge participation flow
- Run tracking initiation

### Recording Screens
- **record.tsx**: Main run recording interface
- **recordRun.tsx**: Alternative recording interface
- **runComplete.tsx**: Post-run completion screen

### Completion Screens
- **completion.tsx**: Challenge completion celebration/results

## Key Features

### Navigation
- File-based routing with Expo Router
- Tab navigation for main screens
- Stack navigation for detailed views
- Custom back button with proper navigation

### State Management
- Multiple React Context providers
- Hierarchical provider structure in root layout
- Shared state across the entire app

### Authentication
- Supabase-based authentication
- Guest mode for testing/demo
- Protected routes via AuthWrapper

### Development Features
- Time manipulation for testing challenge states
- Mock data integration
- Debug screens (map_test)

## API Integration Points

- All screens connect to services in `src/services/`
- Mock data used during development
- Easy transition to production APIs
- Environment-based configuration

## Styling Approach

- Consistent theme system
- React Native StyleSheet
- Platform-specific styling where needed
- Centralized color and typography definitions

## Development Notes

- Use of TypeScript throughout
- Proper error boundaries and loading states
- Location permissions handled at app level
- Context providers organized by feature domain
