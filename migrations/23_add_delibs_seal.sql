-- Migration #23: Add Delibs Seal Functionality
-- ---------------------------------------------------------------
-- Adds a sealed_pnm_id column to the rounds table to track which PNM is sealed
-- When a PNM is sealed, voting is disabled but results remain visible

-- Add sealed_pnm_id column to rounds table
ALTER TABLE rounds
    ADD COLUMN IF NOT EXISTS sealed_pnm_id    UUID REFERENCES pnms(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS rounds_sealed_pnm_idx ON rounds (sealed_pnm_id); 