-- Migration #27: Add pronouns and minor to PNMs
-- ---------------------------------------------------------------
-- Adds two nullable text columns to the public.pnms table:
--   - pronouns: e.g., "she/her", "he/him", "they/them"
--   - minor: academic minor (free-form text similar to major)

ALTER TABLE public.pnms
  ADD COLUMN IF NOT EXISTS pronouns TEXT,
  ADD COLUMN IF NOT EXISTS minor TEXT;

-- Optional indexes can be added later if filtering frequently on these fields
-- CREATE INDEX IF NOT EXISTS idx_pnms_pronouns ON public.pnms(pronouns);
-- CREATE INDEX IF NOT EXISTS idx_pnms_minor ON public.pnms(minor);


