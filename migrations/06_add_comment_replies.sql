-- Add parent_id column to comments table for replies
ALTER TABLE comments
ADD COLUMN parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- Create index for better performance when querying replies
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON comments (parent_id);

-- Update RLS policies to allow replies
DROP POLICY IF EXISTS comments_write_by_author ON comments;
CREATE POLICY comments_write_by_author ON comments
  FOR ALL USING (
    auth.uid() = brother_id
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_id AND r.status = 'open'
    )
  ); 