-- Replace the problematic section with this:
DO $$
BEGIN
  -- challenges
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='challenges' AND policyname='read_challenges'
  ) THEN
    CREATE POLICY "read_challenges"
    ON public.challenges
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;

  -- tracks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='tracks' AND policyname='read_tracks'
  ) THEN
    CREATE POLICY "read_tracks"
    ON public.tracks
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;

  -- challenge_attendees
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='challenge_attendees' AND policyname='read_challenge_attendees'
  ) THEN
    CREATE POLICY "read_challenge_attendees"
    ON public.challenge_attendees
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;

  -- profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='profiles' AND policyname='read_profiles'
  ) THEN
    CREATE POLICY "read_profiles"
    ON public.profiles
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;

  -- runs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='runs' AND policyname='read_runs'
  ) THEN
    CREATE POLICY "read_runs"
    ON public.runs
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END$$;