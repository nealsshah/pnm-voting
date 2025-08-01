-- Migration: Add Delibs Voting RLS Policies (requires 'delibs' enum value to exist)
-- ------------------------------------------------------------------

-- Ensure the enum value is present (should be from previous migration)
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'round_type';
EXCEPTION WHEN undefined_table THEN
  RAISE EXCEPTION 'round_type enum not found';
END $$;

-- Re-create the policies that were commented out in the previous migration

-- READ: Authenticated users can read their own vote OR (if admin) all votes OR
--       any vote once the round has results_revealed = TRUE.
CREATE POLICY IF NOT EXISTS delibs_votes_select_policy ON delibs_votes
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
CREATE POLICY IF NOT EXISTS delibs_votes_insert_policy ON delibs_votes
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
CREATE POLICY IF NOT EXISTS delibs_votes_update_policy ON delibs_votes
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

-- DELETE: Keep only for admins (symmetry with other tables)
CREATE POLICY IF NOT EXISTS delibs_votes_delete_policy ON delibs_votes
    FOR DELETE USING (
        auth.user_has_role('admin')
    );
