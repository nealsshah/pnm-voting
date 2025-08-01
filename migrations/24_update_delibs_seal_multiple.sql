-- Migration #24: Update Delibs Seal to Support Multiple Candidates
-- ---------------------------------------------------------------
-- Changes sealed_pnm_id from single UUID to JSONB array to support multiple sealed candidates
-- Also adds a results_snapshot JSONB field to store vote counts when sealed

-- First, create a backup of current sealed data
CREATE TABLE IF NOT EXISTS sealed_candidates_backup AS 
SELECT id, sealed_pnm_id FROM rounds WHERE sealed_pnm_id IS NOT NULL;

-- Drop the old column and add new columns
ALTER TABLE rounds DROP COLUMN IF EXISTS sealed_pnm_id;
ALTER TABLE rounds ADD COLUMN sealed_pnm_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE rounds ADD COLUMN sealed_results JSONB DEFAULT '{}'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS rounds_sealed_pnm_ids_idx ON rounds USING GIN (sealed_pnm_ids);
CREATE INDEX IF NOT EXISTS rounds_sealed_results_idx ON rounds USING GIN (sealed_results);

-- Migrate existing data (if any)
UPDATE rounds 
SET sealed_pnm_ids = CASE 
    WHEN sealed_pnm_id IS NOT NULL THEN jsonb_build_array(sealed_pnm_id)
    ELSE '[]'::jsonb
END
FROM sealed_candidates_backup 
WHERE rounds.id = sealed_candidates_backup.id;

-- Clean up backup table
DROP TABLE IF EXISTS sealed_candidates_backup; 