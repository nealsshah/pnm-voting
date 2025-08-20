-- Migration #25: Add hidden flag to PNMs
-- ---------------------------------------------------------------
-- Adds a boolean column to mark PNMs as hidden from non-admin views

ALTER TABLE public.pnms
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS pnms_hidden_idx ON public.pnms (hidden);


