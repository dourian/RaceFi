-- Public read access normalization for anon and authenticated
-- Idempotent migration: safe to run multiple times

-- 1) Schema usage for both roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2) Table-level SELECT for both roles
GRANT SELECT ON TABLE public.challenges TO anon, authenticated;
GRANT SELECT ON TABLE public.tracks TO anon, authenticated;
GRANT SELECT ON TABLE public.challenge_attendees TO anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT SELECT ON TABLE public.runs TO anon, authenticated;

-- 3) Optional: default privileges for future tables
DO $$
BEGIN
  -- Only the owner can alter default privileges; ignore errors for non-owners
  BEGIN
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
  EXCEPTION WHEN others THEN
    -- no-op
  END;
END$$;

-- 4) Enable RLS (ensure not forced) on relevant tables
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.challenges NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tracks NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_attendees NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.runs NO FORCE ROW LEVEL SECURITY;

-- 5) Replace/standardize SELECT policies: drop known variants then create a single permissive one per table
DO $$
BEGIN
  -- challenges
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='challenges' AND cmd='SELECT'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "public read challenges" ON public.challenges';
    EXECUTE 'DROP POLICY IF EXISTS "read_challenges" ON public.challenges';
  END IF;
  CREATE POLICY IF NOT EXISTS "read_challenges"
    ON public.challenges
    FOR SELECT
    TO anon, authenticated
    USING (true);

  -- tracks
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='tracks' AND cmd='SELECT'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "public read tracks" ON public.tracks';
    EXECUTE 'DROP POLICY IF EXISTS "read_tracks" ON public.tracks';
  END IF;
  CREATE POLICY IF NOT EXISTS "read_tracks"
    ON public.tracks
    FOR SELECT
    TO anon, authenticated
    USING (true);

  -- challenge_attendees
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='challenge_attendees' AND cmd='SELECT'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "public read challenge_attendees" ON public.challenge_attendees';
    EXECUTE 'DROP POLICY IF EXISTS "read_challenge_attendees" ON public.challenge_attendees';
  END IF;
  CREATE POLICY IF NOT EXISTS "read_challenge_attendees"
    ON public.challenge_attendees
    FOR SELECT
    TO anon, authenticated
    USING (true);

  -- profiles (public read of minimal profile data; adjust later if needed)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='profiles' AND cmd='SELECT'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "public read profiles" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "read_profiles" ON public.profiles';
  END IF;
  CREATE POLICY IF NOT EXISTS "read_profiles"
    ON public.profiles
    FOR SELECT
    TO anon, authenticated
    USING (true);

  -- runs (read-only public)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='runs' AND cmd='SELECT'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "public read runs" ON public.runs';
    EXECUTE 'DROP POLICY IF EXISTS "read_runs" ON public.runs';
  END IF;
  CREATE POLICY IF NOT EXISTS "read_runs"
    ON public.runs
    FOR SELECT
    TO anon, authenticated
    USING (true);
END$$;

-- 6) Diagnostics to verify after migration (optional; comment out in production)
-- SELECT n.nspname AS schema, c.relname AS table, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
-- FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname='public' AND c.relname IN ('challenges','tracks','challenge_attendees','profiles','runs');
-- SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname='public' AND tablename IN ('challenges','tracks','challenge_attendees','profiles','runs')
-- ORDER BY tablename, policyname;

