-- 16_create_pnm_attendance.sql
-- Creates table to track PNM attendance at events

CREATE TABLE IF NOT EXISTS public.pnm_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pnm_id UUID NOT NULL REFERENCES public.pnms(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (pnm_id, event_name)
);

-- Basic RLS: only admins can insert/delete, everyone can select
ALTER TABLE public.pnm_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read" ON public.pnm_attendance
  FOR SELECT USING (true);

CREATE POLICY "Admins can write" ON public.pnm_attendance
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users_metadata um WHERE um.id = auth.uid() AND um.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users_metadata um WHERE um.id = auth.uid() AND um.role = 'admin')); 