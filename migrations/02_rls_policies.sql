-- Enable RLS on all tables
ALTER TABLE pnms ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_metadata ENABLE ROW LEVEL SECURITY;

-- Create a function to check user role
CREATE OR REPLACE FUNCTION auth.user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role::TEXT INTO user_role
  FROM public.users_metadata
  WHERE id = auth.uid();
  
  RETURN user_role = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a round is open
CREATE OR REPLACE FUNCTION public.is_round_open(check_round_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  round_status TEXT;
BEGIN
  SELECT status::TEXT INTO round_status
  FROM public.rounds
  WHERE id = check_round_id;
  
  RETURN round_status = 'open';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PNMs table policies
-- Anyone authenticated can read, only admins can write
CREATE POLICY pnms_select_policy ON pnms
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY pnms_insert_policy ON pnms
  FOR INSERT WITH CHECK (auth.user_has_role('admin'));
  
CREATE POLICY pnms_update_policy ON pnms
  FOR UPDATE USING (auth.user_has_role('admin'));
  
CREATE POLICY pnms_delete_policy ON pnms
  FOR DELETE USING (auth.user_has_role('admin'));

-- Events table policies
-- Anyone authenticated can read, only admins can write
CREATE POLICY events_select_policy ON events
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY events_insert_policy ON events
  FOR INSERT WITH CHECK (auth.user_has_role('admin'));
  
CREATE POLICY events_update_policy ON events
  FOR UPDATE USING (auth.user_has_role('admin'));
  
CREATE POLICY events_delete_policy ON events
  FOR DELETE USING (auth.user_has_role('admin'));

-- Rounds table policies
-- Anyone authenticated can read, only admins can write
CREATE POLICY rounds_select_policy ON rounds
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY rounds_insert_policy ON rounds
  FOR INSERT WITH CHECK (auth.user_has_role('admin'));
  
CREATE POLICY rounds_update_policy ON rounds
  FOR UPDATE USING (auth.user_has_role('admin'));
  
CREATE POLICY rounds_delete_policy ON rounds
  FOR DELETE USING (auth.user_has_role('admin'));

-- Votes table policies
-- Brothers can insert/update/delete their own votes only when round is open
CREATE POLICY votes_select_policy ON votes
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY votes_insert_policy ON votes
  FOR INSERT WITH CHECK (
    auth.uid() = brother_id AND 
    auth.user_has_role('brother') AND 
    public.is_round_open(round_id)
  );
  
CREATE POLICY votes_update_policy ON votes
  FOR UPDATE USING (
    auth.uid() = brother_id AND 
    auth.user_has_role('brother') AND 
    public.is_round_open(round_id)
  );
  
CREATE POLICY votes_delete_policy ON votes
  FOR DELETE USING (
    auth.uid() = brother_id AND 
    auth.user_has_role('brother') AND 
    public.is_round_open(round_id)
  );

-- Comments table policies
-- Brothers can insert/update/delete their own comments only when round is open
-- Admins can delete any comment
CREATE POLICY comments_select_policy ON comments
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY comments_insert_policy ON comments
  FOR INSERT WITH CHECK (
    auth.uid() = brother_id AND 
    auth.user_has_role('brother') AND 
    public.is_round_open(round_id)
  );
  
CREATE POLICY comments_update_policy ON comments
  FOR UPDATE USING (
    auth.uid() = brother_id AND 
    auth.user_has_role('brother') AND 
    public.is_round_open(round_id)
  );
  
CREATE POLICY comments_delete_policy ON comments
  FOR DELETE USING (
    (auth.uid() = brother_id AND auth.user_has_role('brother') AND public.is_round_open(round_id))
    OR auth.user_has_role('admin')
  );

-- Users metadata policies
-- Users can read all metadata, but can only update their own if they're admins
CREATE POLICY users_metadata_select_policy ON users_metadata
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY users_metadata_insert_policy ON users_metadata
  FOR INSERT WITH CHECK (
    auth.uid() = id OR auth.user_has_role('admin')
  );
  
CREATE POLICY users_metadata_update_policy ON users_metadata
  FOR UPDATE USING (
    auth.user_has_role('admin')
  );
  
CREATE POLICY users_metadata_delete_policy ON users_metadata
  FOR DELETE USING (
    auth.user_has_role('admin')
  );

-- Create Storage bucket with policies
-- Storage policies will be set up in the Supabase dashboard:
-- 1. Create bucket 'pnm-photos' with public read, authenticated write
-- 2. Set RLS for uploads to require admin role
-- 3. Allow public read access 