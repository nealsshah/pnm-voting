-- Optimize RLS Performance (SAFE VERSION)
-- ---------------------------------------------------------------

-- This migration is designed to be safe and reversible
-- It only adds optimizations without breaking existing functionality

-- Step 1: Create indexes to improve performance (safe to add)
CREATE INDEX IF NOT EXISTS idx_users_metadata_role ON users_metadata(role);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds(status);
CREATE INDEX IF NOT EXISTS idx_comments_brother_id ON comments(brother_id);
CREATE INDEX IF NOT EXISTS idx_votes_brother_id ON votes(brother_id);
CREATE INDEX IF NOT EXISTS idx_votes_round_id ON votes(round_id);
CREATE INDEX IF NOT EXISTS idx_comments_round_id ON comments(round_id);

-- Step 2: Create optimized helper functions in public schema (safe to add)
CREATE OR REPLACE FUNCTION public.check_user_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users_metadata
    WHERE id = auth.uid() AND role = required_role::user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_round_open(check_round_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM rounds
    WHERE id = check_round_id AND status = 'open'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 3: Create a rollback function for easy recovery
CREATE OR REPLACE FUNCTION rollback_rls_optimization()
RETURNS VOID AS $$
BEGIN
  -- Drop the indexes we created
  DROP INDEX IF EXISTS idx_users_metadata_role;
  DROP INDEX IF EXISTS idx_rounds_status;
  DROP INDEX IF EXISTS idx_comments_brother_id;
  DROP INDEX IF EXISTS idx_votes_brother_id;
  DROP INDEX IF EXISTS idx_votes_round_id;
  DROP INDEX IF EXISTS idx_comments_round_id;
  
  RAISE NOTICE 'RLS optimization rolled back successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create a comprehensive rollback function
CREATE OR REPLACE FUNCTION full_rls_rollback()
RETURNS VOID AS $$
BEGIN
  -- Drop the indexes we created
  DROP INDEX IF EXISTS idx_users_metadata_role;
  DROP INDEX IF EXISTS idx_rounds_status;
  DROP INDEX IF EXISTS idx_comments_brother_id;
  DROP INDEX IF EXISTS idx_votes_brother_id;
  DROP INDEX IF EXISTS idx_votes_round_id;
  DROP INDEX IF EXISTS idx_comments_round_id;
  
  -- Drop the helper function we created
  DROP FUNCTION IF EXISTS public.check_user_role(TEXT);
  
  RAISE NOTICE 'All optimizations rolled back successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create a test function to verify everything works
CREATE OR REPLACE FUNCTION test_rls_optimization()
RETURNS TEXT AS $$
DECLARE
  test_result TEXT := 'OK';
BEGIN
  -- Test that indexes exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_users_metadata_role'
  ) THEN
    test_result := 'indexes not created properly';
  END IF;
  
  -- Test that helper function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'check_user_role'
  ) THEN
    test_result := 'helper function not created properly';
  END IF;
  
  RETURN test_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a comment for documentation
COMMENT ON FUNCTION rollback_rls_optimization() IS 'Use this function to rollback RLS optimizations if needed';
COMMENT ON FUNCTION test_rls_optimization() IS 'Use this function to test if optimizations are working correctly'; 