-- Relax RLS for inserts into users_metadata so trigger can populate rows
DROP POLICY IF EXISTS users_metadata_insert_policy ON users_metadata;

-- Allow inserts from trigger or any context (row values not restricted)
CREATE POLICY users_metadata_insert_policy ON users_metadata
  FOR INSERT WITH CHECK (true);

-- Keep existing select/update/delete policies unchanged 