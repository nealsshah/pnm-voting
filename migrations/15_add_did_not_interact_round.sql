-- Migration: Add Did Not Interact Round Type and Interactions Table
-- 1. Create enum type for round_type
DO $$ BEGIN
    CREATE TYPE round_type AS ENUM ('traditional', 'did_not_interact');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add the new column to rounds (default traditional)
ALTER TABLE rounds
    ADD COLUMN IF NOT EXISTS type round_type DEFAULT 'traditional';

-- 3. Interactions table to store quick yes/no interaction records
CREATE TABLE IF NOT EXISTS interactions (
    brother_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pnm_id     UUID REFERENCES pnms(id)       ON DELETE CASCADE,
    round_id   UUID REFERENCES rounds(id)     ON DELETE CASCADE,
    interacted BOOLEAN                        NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (brother_id, pnm_id, round_id)
);

-- 4. Index for faster look-ups
CREATE INDEX IF NOT EXISTS interactions_pnm_round_idx ON interactions (pnm_id, round_id);

-- 5. Enable Row Level Security
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- 6. Grant access policies (mirrors votes but limited to did_not_interact rounds)
CREATE POLICY interactions_select_policy ON interactions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY interactions_insert_policy ON interactions
    FOR INSERT WITH CHECK (
        auth.uid() = brother_id
        AND auth.user_has_role('brother')
        AND public.is_round_open(round_id)
        AND EXISTS (
            SELECT 1 FROM rounds r
            WHERE r.id = round_id AND r.type = 'did_not_interact'
        )
    );

CREATE POLICY interactions_update_policy ON interactions
    FOR UPDATE USING (
        auth.uid() = brother_id
        AND auth.user_has_role('brother')
        AND public.is_round_open(round_id)
        AND EXISTS (
            SELECT 1 FROM rounds r
            WHERE r.id = round_id AND r.type = 'did_not_interact'
        )
    );

CREATE POLICY interactions_delete_policy ON interactions
    FOR DELETE USING (
        auth.uid() = brother_id
        AND auth.user_has_role('brother')
        AND public.is_round_open(round_id)
        AND EXISTS (
            SELECT 1 FROM rounds r
            WHERE r.id = round_id AND r.type = 'did_not_interact'
        )
    ); 