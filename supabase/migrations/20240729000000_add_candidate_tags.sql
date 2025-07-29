-- Migration: Add Candidate Tags Table
-- This migration adds support for tagging candidates with colored dots (red, yellow, green)

-- Create enum type for tag colors
DO $$ BEGIN
    CREATE TYPE tag_color AS ENUM ('red', 'yellow', 'green');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the candidate_tags table
CREATE TABLE IF NOT EXISTS candidate_tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pnm_id      UUID REFERENCES pnms(id) ON DELETE CASCADE,
    color       tag_color NOT NULL,
    created_by  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(pnm_id, color) -- Only one tag of each color per candidate
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS candidate_tags_pnm_idx ON candidate_tags (pnm_id);
CREATE INDEX IF NOT EXISTS candidate_tags_color_idx ON candidate_tags (color);

-- Enable Row Level Security
ALTER TABLE candidate_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Anyone authenticated can read tags
CREATE POLICY candidate_tags_select_policy ON candidate_tags
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can insert/update/delete tags
CREATE POLICY candidate_tags_insert_policy ON candidate_tags
    FOR INSERT WITH CHECK (auth.user_has_role('admin'));

CREATE POLICY candidate_tags_update_policy ON candidate_tags
    FOR UPDATE USING (auth.user_has_role('admin'));

CREATE POLICY candidate_tags_delete_policy ON candidate_tags
    FOR DELETE USING (auth.user_has_role('admin')); 