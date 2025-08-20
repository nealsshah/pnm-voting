-- 26_create_recruitment_cycles.sql
-- Introduces recruitment cycles and scopes core tables with a cycle_id.
-- Safe, backward-compatible: seeds a legacy cycle and defaults all existing/new rows to it.

-- 1) Enum for cycle status ------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE cycle_status AS ENUM ('planned', 'active', 'archived');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2) Recruitment cycles table ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recruitment_cycles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,                 -- e.g., "Fall 2025"
    season      TEXT,                          -- optional: Fall / Spring
    year        INT,                           -- optional: 2025
    status      cycle_status DEFAULT 'active',
    started_at  TIMESTAMPTZ,
    ended_at    TIMESTAMPTZ,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS and add basic policies (read for all authenticated, write for admins)
ALTER TABLE public.recruitment_cycles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- READ policy
  BEGIN
    DROP POLICY IF EXISTS recruitment_cycles_select ON public.recruitment_cycles;
  EXCEPTION WHEN others THEN NULL; END;
  CREATE POLICY recruitment_cycles_select ON public.recruitment_cycles
    FOR SELECT USING (auth.role() = 'authenticated');

  -- WRITE policy (admin only)
  BEGIN
    DROP POLICY IF EXISTS recruitment_cycles_admin_all ON public.recruitment_cycles;
  EXCEPTION WHEN others THEN NULL; END;
  CREATE POLICY recruitment_cycles_admin_all ON public.recruitment_cycles
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.users_metadata um
        WHERE um.id = auth.uid() AND um.role = 'admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users_metadata um
        WHERE um.id = auth.uid() AND um.role = 'admin'
      )
    );
END $$;

-- 3) Helper: read current cycle id from settings -------------------------------
-- We store settings.value for key 'current_cycle_id' as a JSON object: {"id": "<uuid>"}
CREATE OR REPLACE FUNCTION public.get_current_cycle_id()
RETURNS UUID AS $$
DECLARE
    v UUID;
BEGIN
    SELECT (value->>'id')::uuid INTO v
    FROM public.settings
    WHERE key = 'current_cycle_id';

    RETURN v;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4) Seed a legacy cycle if none exists ----------------------------------------
DO $$
DECLARE
    legacy_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.recruitment_cycles) THEN
        INSERT INTO public.recruitment_cycles(name, season, year, status, started_at)
        VALUES ('Legacy Cycle', NULL, NULL, 'active', now())
        RETURNING id INTO legacy_id;

        -- Ensure settings row exists
        INSERT INTO public.settings(key, value)
        VALUES ('current_cycle_id', jsonb_build_object('id', legacy_id))
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
    ELSE
        -- If cycles exist but no current_cycle_id setting, set it to the most recent active
        IF NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'current_cycle_id') THEN
            SELECT id INTO legacy_id FROM public.recruitment_cycles
            WHERE status = 'active'
            ORDER BY created_at DESC
            LIMIT 1;
            IF legacy_id IS NULL THEN
                SELECT id INTO legacy_id FROM public.recruitment_cycles ORDER BY created_at DESC LIMIT 1;
            END IF;
            IF legacy_id IS NOT NULL THEN
                INSERT INTO public.settings(key, value)
                VALUES ('current_cycle_id', jsonb_build_object('id', legacy_id))
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
            END IF;
        END IF;
    END IF;
END $$;

-- 5) Add cycle_id to core tables (default to current) --------------------------
-- Helper macro-ish: add, backfill, set NOT NULL, index

-- pnms -------------------------------------------------------------------------
ALTER TABLE public.pnms ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.recruitment_cycles(id);
UPDATE public.pnms SET cycle_id = public.get_current_cycle_id() WHERE cycle_id IS NULL;
ALTER TABLE public.pnms ALTER COLUMN cycle_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pnms_cycle_id ON public.pnms(cycle_id);
-- Adjust uniqueness: allow same email across different cycles
DO $$ BEGIN
  BEGIN
    ALTER TABLE public.pnms DROP CONSTRAINT IF EXISTS pnms_email_key;
  EXCEPTION WHEN undefined_object THEN NULL; END;
  CREATE UNIQUE INDEX IF NOT EXISTS uq_pnms_email_cycle ON public.pnms(email, cycle_id);
END $$;

-- Guard: only if legacy events table exists in this database
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN
    ALTER TABLE public.events ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.recruitment_cycles(id);
    UPDATE public.events SET cycle_id = public.get_current_cycle_id() WHERE cycle_id IS NULL;
    ALTER TABLE public.events ALTER COLUMN cycle_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_events_cycle_id ON public.events(cycle_id);
  END IF;
END $$;

-- rounds -----------------------------------------------------------------------
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.recruitment_cycles(id);
UPDATE public.rounds SET cycle_id = public.get_current_cycle_id() WHERE cycle_id IS NULL;
ALTER TABLE public.rounds ALTER COLUMN cycle_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rounds_cycle_id ON public.rounds(cycle_id);

-- votes ------------------------------------------------------------------------
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.recruitment_cycles(id);
UPDATE public.votes SET cycle_id = public.get_current_cycle_id() WHERE cycle_id IS NULL;
ALTER TABLE public.votes ALTER COLUMN cycle_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_cycle_id ON public.votes(cycle_id);

-- comments ---------------------------------------------------------------------
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.recruitment_cycles(id);
UPDATE public.comments SET cycle_id = public.get_current_cycle_id() WHERE cycle_id IS NULL;
ALTER TABLE public.comments ALTER COLUMN cycle_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_cycle_id ON public.comments(cycle_id);

-- interactions (DNI) -----------------------------------------------------------
ALTER TABLE public.interactions ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.recruitment_cycles(id);
UPDATE public.interactions SET cycle_id = public.get_current_cycle_id() WHERE cycle_id IS NULL;
ALTER TABLE public.interactions ALTER COLUMN cycle_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_cycle_id ON public.interactions(cycle_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'delibs_votes'
  ) THEN
    ALTER TABLE public.delibs_votes ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.recruitment_cycles(id);
    UPDATE public.delibs_votes SET cycle_id = public.get_current_cycle_id() WHERE cycle_id IS NULL;
    ALTER TABLE public.delibs_votes ALTER COLUMN cycle_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_delibs_votes_cycle_id ON public.delibs_votes(cycle_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'attendance_events'
  ) THEN
    ALTER TABLE public.attendance_events ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.recruitment_cycles(id);
    UPDATE public.attendance_events SET cycle_id = public.get_current_cycle_id() WHERE cycle_id IS NULL;
    ALTER TABLE public.attendance_events ALTER COLUMN cycle_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_attendance_events_cycle_id ON public.attendance_events(cycle_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pnm_attendance'
  ) THEN
    ALTER TABLE public.pnm_attendance ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.recruitment_cycles(id);
    UPDATE public.pnm_attendance SET cycle_id = public.get_current_cycle_id() WHERE cycle_id IS NULL;
    ALTER TABLE public.pnm_attendance ALTER COLUMN cycle_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_pnm_attendance_cycle_id ON public.pnm_attendance(cycle_id);
  END IF;
END $$;

-- 6) Keep rounds in sync with events on insert ---------------------------------
-- Replace the trigger function to copy the event's cycle_id into rounds, but only if events table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN
    -- Drop existing trigger/function if present
    BEGIN
      EXECUTE 'DROP TRIGGER IF EXISTS trg_event_insert ON public.events';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      EXECUTE 'DROP FUNCTION IF EXISTS public._after_event_insert()';
    EXCEPTION WHEN others THEN NULL; END;

    -- Recreate function and trigger
    CREATE OR REPLACE FUNCTION public._after_event_insert()
    RETURNS TRIGGER AS $fn$
    BEGIN
      INSERT INTO public.rounds(event_id, cycle_id) VALUES (NEW.id, NEW.cycle_id);
      PERFORM update_event_positions();
      RETURN NEW;
    END
    $fn$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_event_insert
    AFTER INSERT ON public.events
    FOR EACH ROW EXECUTE PROCEDURE public._after_event_insert();
  END IF;
END $$;

-- 7) Optional: ensure future inserts default to current cycle ------------------
-- Do this by setting DEFAULT to the helper function where safe.
ALTER TABLE public.pnms ALTER COLUMN cycle_id SET DEFAULT public.get_current_cycle_id();
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN
    ALTER TABLE public.events ALTER COLUMN cycle_id SET DEFAULT public.get_current_cycle_id();
  END IF;
END $$;
ALTER TABLE public.rounds ALTER COLUMN cycle_id SET DEFAULT public.get_current_cycle_id();
ALTER TABLE public.votes ALTER COLUMN cycle_id SET DEFAULT public.get_current_cycle_id();
ALTER TABLE public.comments ALTER COLUMN cycle_id SET DEFAULT public.get_current_cycle_id();
ALTER TABLE public.interactions ALTER COLUMN cycle_id SET DEFAULT public.get_current_cycle_id();
ALTER TABLE public.delibs_votes ALTER COLUMN cycle_id SET DEFAULT public.get_current_cycle_id();
ALTER TABLE public.attendance_events ALTER COLUMN cycle_id SET DEFAULT public.get_current_cycle_id();
ALTER TABLE public.pnm_attendance ALTER COLUMN cycle_id SET DEFAULT public.get_current_cycle_id();

-- Done. Application code can begin filtering by cycle_id where appropriate.

