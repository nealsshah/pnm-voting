-- 18_create_attendance_events.sql
-- Creates table to link events with attendance and updates pnm_attendance to use event IDs

-- First, create a new table for attendance events (separate from voting events)
CREATE TABLE IF NOT EXISTS public.attendance_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  event_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add RLS to attendance_events
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read attendance_events" ON public.attendance_events
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage attendance_events" ON public.attendance_events
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users_metadata um WHERE um.id = auth.uid() AND um.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users_metadata um WHERE um.id = auth.uid() AND um.role = 'admin'));

-- Migrate existing attendance data
-- First, create attendance events from existing event_name values
INSERT INTO public.attendance_events (name)
SELECT DISTINCT event_name 
FROM public.pnm_attendance 
WHERE event_name IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Add new column to pnm_attendance for event reference
ALTER TABLE public.pnm_attendance ADD COLUMN event_id UUID REFERENCES public.attendance_events(id) ON DELETE CASCADE;

-- Update existing records to use event_id
UPDATE public.pnm_attendance pa
SET event_id = ae.id
FROM public.attendance_events ae
WHERE pa.event_name = ae.name;

-- Now we can make event_id NOT NULL since all records should have been updated
ALTER TABLE public.pnm_attendance ALTER COLUMN event_id SET NOT NULL;

-- Update the unique constraint to use event_id instead of event_name
ALTER TABLE public.pnm_attendance DROP CONSTRAINT IF EXISTS pnm_attendance_pnm_id_event_name_key;
ALTER TABLE public.pnm_attendance ADD CONSTRAINT pnm_attendance_pnm_id_event_id_key UNIQUE (pnm_id, event_id);

-- We can keep event_name for backward compatibility but it's no longer the primary reference
-- In the future, we might remove event_name column entirely 