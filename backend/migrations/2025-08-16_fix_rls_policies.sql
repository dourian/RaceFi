-- Comprehensive RLS policy fix for all tables
-- This migration ensures proper read/write access for authenticated and anonymous users

-- Enable RLS on all tables first
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.challenge_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "read_challenges" ON public.challenges;
DROP POLICY IF EXISTS "read_tracks" ON public.tracks;
DROP POLICY IF EXISTS "read_challenge_attendees" ON public.challenge_attendees;
DROP POLICY IF EXISTS "read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "read_runs" ON public.runs;

-- Create read policies for all tables (allow both anon and authenticated users)
CREATE POLICY "read_challenges"
ON public.challenges
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "read_tracks"
ON public.tracks
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "read_challenge_attendees"
ON public.challenge_attendees
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "read_profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "read_runs"
ON public.runs
FOR SELECT
TO anon, authenticated
USING (true);

-- Create write policies for authenticated users
CREATE POLICY "insert_challenges"
ON public.challenges
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "update_challenges"
ON public.challenges
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "insert_tracks"
ON public.tracks
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "update_tracks"
ON public.tracks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "insert_challenge_attendees"
ON public.challenge_attendees
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "update_challenge_attendees"
ON public.challenge_attendees
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "insert_profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "update_profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "insert_runs"
ON public.runs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "update_runs"
ON public.runs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant basic usage permissions to the anon role
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant full permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure future tables get proper permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;