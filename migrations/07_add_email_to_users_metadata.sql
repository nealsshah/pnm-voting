-- Add email column to users_metadata and update existing rows
ALTER TABLE users_metadata
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Back-fill existing metadata rows with email from auth.users
UPDATE users_metadata m
SET email = u.email
FROM auth.users u
WHERE u.id = m.id
  AND m.email IS NULL;

-- Replace the trigger function to include email when new auth.users rows are created
CREATE OR REPLACE FUNCTION create_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert metadata only if it does not exist
  INSERT INTO users_metadata (id, role, email)
  VALUES (NEW.id, 'pending'::user_role, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 