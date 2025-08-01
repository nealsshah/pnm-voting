-- Migration #21: Add Delibs Voting Round Type and Base Table
-- ---------------------------------------------------------------
-- 1. Adds the value 'delibs' to the round_type enum (safe ADD VALUE).
-- 2. Extends the rounds table with live-voting control columns.
-- 3. Creates the delibs_votes table (yes/no per brother per candidate).
-- NOTE: RLS policies are added in the following migration so that the
--       enum value is committed first.

-- 1. Extend the enum ----------------------------------------------------------
ALTER TYPE round_type ADD VALUE IF NOT EXISTS 'delibs';

-- 2. Add columns for live-voting control --------------------------------------
ALTER TABLE rounds
    ADD COLUMN IF NOT EXISTS current_pnm_id    UUID REFERENCES pnms(id);

ALTER TABLE rounds
    ADD COLUMN IF NOT EXISTS voting_open       BOOLEAN DEFAULT false;

ALTER TABLE rounds
    ADD COLUMN IF NOT EXISTS results_revealed  BOOLEAN DEFAULT false;

-- 3. Create delibs_votes table ------------------------------------------------
CREATE TABLE IF NOT EXISTS delibs_votes (
    brother_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pnm_id      UUID REFERENCES pnms(id)       ON DELETE CASCADE,
    round_id    UUID REFERENCES rounds(id)     ON DELETE CASCADE,
    decision    BOOLEAN NOT NULL,              -- TRUE = Yes, FALSE = No
    updated_at  TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (brother_id, pnm_id, round_id)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS delibs_votes_pnm_round_idx ON delibs_votes (pnm_id, round_id);
CREATE INDEX IF NOT EXISTS delibs_votes_round_idx     ON delibs_votes (round_id);

-- Enable Row Level Security (policies in next migration)
ALTER TABLE delibs_votes ENABLE ROW LEVEL SECURITY;
