# RaceFi Mobile App

A React Native Expo app for fitness challenges with cryptocurrency staking and rewards.

## Overview

RaceFi is a gamified fitness app that allows users to participate in running challenges with real monetary stakes using USDC. Users can join challenges, stake crypto, complete runs using GPS tracking, and earn rewards based on their performance.

## Technology Stack

- **Framework**: React Native with Expo (~53.0.20)
- **Navigation**: Expo Router (~5.1.4) with file-based routing
- **Backend**: Supabase (authentication, database)
- **Maps**: React Native Maps with location tracking
- **State Management**: React Context API
- **Language**: TypeScript

## Project Structure

```
mobile/
├── app/                 # Main app screens and navigation (Expo Router)
├── components/          # Reusable React components
├── constants/          # Type definitions, mock data, and constants
├── src/               # Core services and business logic
├── utils/             # Utility functions and validation
├── scripts/           # Build and validation scripts
└── assets/            # Static assets (images, icons)
```

## Key Features

1. **Challenge System**: Users can browse and join running challenges
2. **Cryptocurrency Staking**: Stake USDC to join challenges
3. **GPS Run Tracking**: Real-time location tracking during runs
4. **Leaderboards**: Compare performance with other participants
5. **Reward Distribution**: Winners earn from the prize pool
6. **Profile Management**: User authentication and profile features

## Environment Setup

The app uses EAS (Expo Application Services) for environment variable management:

- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `OPEN_AI_API_KEY`: OpenAI API key (stored as EAS secret)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in EAS

3. Start the development server:
   ```bash
   npm start
   ```

## Directory Documentation

Each major directory contains its own README file explaining the purpose and contents of that directory:

- [app/README.md](app/README.md) - Main app screens and navigation
- [components/README.md](components/README.md) - React components
- [constants/README.md](constants/README.md) - Types and constants
- [src/README.md](src/README.md) - Services and business logic
- [utils/README.md](utils/README.md) - Utility functions
- [scripts/README.md](scripts/README.md) - Build scripts

## API Integration

Currently uses mock data for development. Each service includes commented-out real API implementations to make switching to production APIs straightforward. See individual service READMEs for API integration details.

## Platform Support

- iOS (with location permissions and background processing)
- Android (with fine/coarse location permissions)
- Web (limited functionality)

## Build Configuration

- EAS Project ID: 4fe0683b-afd8-4aae-85e3-af84b0649d46
- Bundle ID: com.mastersuperd18.racefi
- App Name: RaceFi

## Development Notes

- The app uses a time management system for controlling challenge states during development
- Mock data is provided for testing all challenge flows
- All location-dependent features require appropriate device permissions
