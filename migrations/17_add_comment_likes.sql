-- Enable likes on comments by introducing comment_likes table and RLS policies
-- ---------------------------------------------------------------
-- Table definition
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  brother_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (comment_id, brother_id)
);

-- Helpful index for counting likes on a comment
CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON comment_likes (comment_id);

-- ---------------------------------------------------------------
-- Row-Level Security policies
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Any authenticated brother/admin can read likes
CREATE POLICY comment_likes_select_policy ON comment_likes
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM users_metadata
      WHERE id = auth.uid() AND role IN ('brother', 'admin')
    )
  );

-- Brothers can like (insert) if they are the current user and the related round is open
CREATE POLICY comment_likes_insert_policy ON comment_likes
  FOR INSERT WITH CHECK (
    auth.uid() = brother_id AND
    EXISTS (
      SELECT 1
      FROM comments c
      JOIN rounds r ON r.id = c.round_id
      WHERE c.id = comment_id AND r.status = 'open'
    )
  );

-- Brothers can unlike (delete) their like while round is open
CREATE POLICY comment_likes_delete_policy ON comment_likes
  FOR DELETE USING (
    auth.uid() = brother_id AND
    EXISTS (
      SELECT 1
      FROM comments c
      JOIN rounds r ON r.id = c.round_id
      WHERE c.id = comment_id AND r.status = 'open'
    )
  );

-- Admins can delete likes at any time
CREATE POLICY comment_likes_admin_delete ON comment_likes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users_metadata
      WHERE id = auth.uid() AND role = 'admin'
    )
  ); 