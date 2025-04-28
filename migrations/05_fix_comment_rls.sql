-- Drop existing policies for comments
DROP POLICY IF EXISTS comments_read ON comments;
DROP POLICY IF EXISTS comments_write_by_author ON comments;
DROP POLICY IF EXISTS comments_admin_delete ON comments;

-- READ: any authenticated user (must be brother or admin)
CREATE POLICY comments_read ON comments
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- WRITE: Any authenticated user can insert/update their own comments when round is open
CREATE POLICY comments_insert ON comments
  FOR INSERT WITH CHECK (
    auth.uid() = brother_id
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_id AND r.status = 'open'
    )
  );

-- UPDATE: Users can update their own comments
CREATE POLICY comments_update ON comments
  FOR UPDATE USING (
    auth.uid() = brother_id
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_id AND r.status = 'open'
    )
  );

-- DELETE: Users can delete their own comments, admins can delete any
CREATE POLICY comments_delete_by_author ON comments
  FOR DELETE USING (
    auth.uid() = brother_id
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_id AND r.status = 'open'
    )
  );

CREATE POLICY comments_admin_delete ON comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users_metadata
      WHERE id = auth.uid() AND role = 'admin'
    )
  ); 