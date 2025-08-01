-- Migration: Add Delibs Voting Round Type and Delibs Votes Table
-- ------------------------------------------------------------------
-- This migration introduces the new "Delibs" live-voting workflow.
-- 1. Adds the value 'delibs' to the round_type enum.
-- 2. Extends the rounds table with live-voting control columns.
-- 3. Creates the delibs_votes table (yes/no per brother per candidate).
-- 4. Enables Row Level Security and initial access policies.
-- ------------------------------------------------------------------

-- 1. Extend the round_type enum ------------------------------------------------
ALTER TYPE round_type ADD VALUE IF NOT EXISTS 'delibs';

-- 2. Add control columns used only by Delibs rounds ----------------------------
-- current_pnm_id     : The candidate currently being deliberated / voted on
-- voting_open        : Whether brothers are allowed to cast votes right now
-- results_revealed   : Whether aggregated results are visible to brothers
ALTER TABLE rounds
    ADD COLUMN IF NOT EXISTS current_pnm_id UUID REFERENCES pnms(id);

ALTER TABLE rounds
    ADD COLUMN IF NOT EXISTS voting_open BOOLEAN DEFAULT false;

ALTER TABLE rounds
    ADD COLUMN IF NOT EXISTS results_revealed BOOLEAN DEFAULT false;

-- 3. Create the delibs_votes table --------------------------------------------
CREATE TABLE IF NOT EXISTS delibs_votes (
    brother_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pnm_id      UUID REFERENCES pnms(id)       ON DELETE CASCADE,
    round_id    UUID REFERENCES rounds(id)     ON DELETE CASCADE,
    decision    BOOLEAN NOT NULL,                  -- TRUE = Yes, FALSE = No
    updated_at  TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (brother_id, pnm_id, round_id)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS delibs_votes_pnm_round_idx   ON delibs_votes (pnm_id, round_id);
CREATE INDEX IF NOT EXISTS delibs_votes_round_idx       ON delibs_votes (round_id);

-- 4. Enable Row Level Security -------------------------------------------------
ALTER TABLE delibs_votes ENABLE ROW LEVEL SECURITY;

/*

-- 5. Initial RLS policies ------------------------------------------------------
-- Note: We mirror the pattern used for traditional votes/interactions.
--       Fine-grained rules (e.g. hiding until reveal) can be refined later.

-- READ: Authenticated users can read their own vote OR (if admin) all votes OR
--       any vote once the round has results_revealed = TRUE.
CREATE POLICY delibs_votes_select_policy ON delibs_votes
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            auth.uid() = brother_id
            OR auth.user_has_role('admin')
            OR EXISTS (
                SELECT 1
                FROM rounds r
                WHERE r.id = round_id
                  AND r.type = 'delibs'
                  AND r.results_revealed = true
            )
        )
    );

-- INSERT: Brothers can cast a vote when voting is open for the current PNM.
CREATE POLICY delibs_votes_insert_policy ON delibs_votes
    FOR INSERT WITH CHECK (
        auth.uid() = brother_id
        AND auth.user_has_role('brother')
        AND public.is_round_open(round_id)
        AND EXISTS (
            SELECT 1
            FROM rounds r
            WHERE r.id = round_id
              AND r.type = 'delibs'
              AND r.voting_open = true
              AND r.current_pnm_id = pnm_id
        )
    );

-- UPDATE: Brothers can update their vote under the same conditions.
CREATE POLICY delibs_votes_update_policy ON delibs_votes
    FOR UPDATE USING (
        auth.uid() = brother_id
        AND auth.user_has_role('brother')
        AND public.is_round_open(round_id)
        AND EXISTS (
            SELECT 1
            FROM rounds r
            WHERE r.id = round_id
              AND r.type = 'delibs'
              AND r.voting_open = true
              AND r.current_pnm_id = pnm_id
        )
    );

-- DELETE: Not allowed (use UPDATE instead) – but keep symmetry for admins
CREATE POLICY delibs_votes_delete_policy ON delibs_votes
    FOR DELETE USING (
        auth.user_has_role('admin')
    );
*/
