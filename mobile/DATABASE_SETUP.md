# RaceFi Database Setup

This document explains how to set up the Supabase database for the RaceFi app.

## Prerequisites

1. A Supabase account and project
2. Access to your Supabase project's SQL editor

## Setup Steps

### 1. Create the Database Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase-schema.sql` and paste it into the SQL editor
4. Run the script to create all tables, functions, and policies

### 2. Verify the Setup

After running the schema script, you should see:

- **Tables created:**

  - `challenges` - Main challenge information
  - `tracks` - GPS coordinates for challenge routes
  - `participants` - Users participating in challenges
  - `runs` - Individual run data
  - `badges` - Achievement badges
  - `user_badges` - Badges earned by users

- **Enums created:**

  - `difficulty_level` - Easy, Moderate, Hard
  - `participant_status` - joined, running, completed

- **Functions and triggers:**

  - Auto-update timestamps
  - Participant count management

- **Row Level Security (RLS) policies** for data privacy

### 3. Update Your Environment Variables

Make sure your app has the correct Supabase configuration:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Test the Database

You can test the database by inserting a sample challenge:

```sql
INSERT INTO challenges (
  name,
  description,
  distance_km,
  window_days,
  stake,
  elevation,
  difficulty,
  prize_pool,
  max_participants,
  location,
  start_date,
  end_date,
  creator_name
) VALUES (
  'Test 5K Challenge',
  'A test challenge for development',
  5.0,
  7,
  5.00,
  85,
  'Moderate',
  120.00,
  30,
  'San Francisco, CA',
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '8 days',
  'Test Creator'
);
```

## Database Schema Overview

### Challenges Table

- Stores all challenge information (name, description, distance, stake, etc.)
- Links to creator via `creator_id` (references Supabase auth.users)
- Includes time windows and participant limits

### Tracks Table

- Stores GPS coordinates for challenge routes
- Uses JSONB for flexible coordinate storage
- Links to challenges via `challenge_id`

### Participants Table

- Tracks users who join challenges
- Stores stake amounts and transaction hashes
- Tracks participation status and run data

### Runs Table

- Stores individual run data during challenges
- Includes GPS tracking, timing, and validation metrics
- Links to both participants and challenges

### Badges Table

- Achievement system for users
- Flexible criteria using JSONB
- Supports NFT integration

## Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Authentication required** for creating challenges and joining
- **Data privacy** - users can only see their own runs and badges
- **Public read access** for challenges and basic participant info

## Performance Optimizations

- **Indexes** on frequently queried fields
- **Full-text search** on location fields
- **Efficient joins** between related tables
- **Automatic timestamp updates** via triggers

## Next Steps

1. Update your app to use the new database types from `database.types.ts`
2. Replace mock data calls with Supabase queries
3. Implement authentication flow
4. Add real-time subscriptions for challenge updates

## Troubleshooting

### Common Issues

1. **Permission denied errors**: Check RLS policies and user authentication
2. **Missing tables**: Ensure the schema script ran completely
3. **Type errors**: Verify you're using the correct types from `database.types.ts`

### Getting Help

- Check Supabase logs in the dashboard
- Verify your environment variables are correct
- Ensure your Supabase project has the necessary extensions enabled
