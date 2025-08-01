-- Migration #22: Add RLS Policies for Delibs Voting
-- --------------------------------------------------
-- Requires migration #21 to have run so that the 'delibs' enum value,
-- rounds columns, and delibs_votes table already exist.
-- Postgres <15 does not support "CREATE POLICY IF NOT EXISTS", so we
-- drop any existing policy before (re)creating it.

------------------------------ SELECT ------------------------------
DROP POLICY IF EXISTS delibs_votes_select_policy ON delibs_votes;
CREATE POLICY delibs_votes_select_policy ON delibs_votes
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            auth.uid() = brother_id
            OR auth.user_has_role('admin')
            OR EXISTS (
                SELECT 1 FROM rounds r
                 WHERE r.id = delibs_votes.round_id
                   AND r.type = 'delibs'
                   AND r.results_revealed = true)
        )
    );

------------------------------ INSERT ------------------------------
DROP POLICY IF EXISTS delibs_votes_insert_policy ON delibs_votes;
CREATE POLICY delibs_votes_insert_policy ON delibs_votes
    FOR INSERT WITH CHECK (
        auth.uid() = brother_id
        AND auth.user_has_role('brother')
        AND public.is_round_open(round_id)
        AND EXISTS (
            SELECT 1 FROM rounds r
             WHERE r.id = delibs_votes.round_id
               AND r.type = 'delibs'
               AND r.voting_open = true
               AND r.current_pnm_id = delibs_votes.pnm_id)
    );

------------------------------ UPDATE ------------------------------
DROP POLICY IF EXISTS delibs_votes_update_policy ON delibs_votes;
CREATE POLICY delibs_votes_update_policy ON delibs_votes
    FOR UPDATE USING (
        auth.uid() = brother_id
        AND auth.user_has_role('brother')
        AND public.is_round_open(round_id)
        AND EXISTS (
            SELECT 1 FROM rounds r
             WHERE r.id = delibs_votes.round_id
               AND r.type = 'delibs'
               AND r.voting_open = true
               AND r.current_pnm_id = delibs_votes.pnm_id)
    );

------------------------------ DELETE ------------------------------
DROP POLICY IF EXISTS delibs_votes_delete_policy ON delibs_votes;
CREATE POLICY delibs_votes_delete_policy ON delibs_votes
    FOR DELETE USING (auth.user_has_role('admin'));

