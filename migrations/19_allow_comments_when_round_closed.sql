-- Allow comments and likes regardless of round status
-- ---------------------------------------------------------------

-- Update comments table policies to allow operations regardless of round status
DROP POLICY IF EXISTS comments_insert ON comments;
DROP POLICY IF EXISTS comments_update ON comments;
DROP POLICY IF EXISTS comments_delete_by_author ON comments;

-- INSERT: Any authenticated user can insert their own comments regardless of round status
CREATE POLICY comments_insert ON comments
  FOR INSERT WITH CHECK (
    auth.uid() = brother_id
  );

-- UPDATE: Users can update their own comments regardless of round status
CREATE POLICY comments_update ON comments
  FOR UPDATE USING (
    auth.uid() = brother_id
  );

-- DELETE: Users can delete their own comments, admins can delete any
CREATE POLICY comments_delete_by_author ON comments
  FOR DELETE USING (
    auth.uid() = brother_id
  );

-- Update comment_likes table policies to allow operations regardless of round status
DROP POLICY IF EXISTS comment_likes_insert_policy ON comment_likes;
DROP POLICY IF EXISTS comment_likes_delete_policy ON comment_likes;

-- Brothers can like (insert) if they are the current user regardless of round status
CREATE POLICY comment_likes_insert_policy ON comment_likes
  FOR INSERT WITH CHECK (
    auth.uid() = brother_id
  );

-- Brothers can unlike (delete) their like regardless of round status
CREATE POLICY comment_likes_delete_policy ON comment_likes
  FOR DELETE USING (
    auth.uid() = brother_id
  ); 