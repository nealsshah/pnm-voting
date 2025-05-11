-- Add first_name and last_name columns to users_metadata
ALTER TABLE users_metadata
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Update the trigger function to include the new fields
CREATE OR REPLACE FUNCTION create_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert metadata only if it does not exist
  INSERT INTO users_metadata (id, role, email, first_name, last_name)
  VALUES (NEW.id, 'pending'::user_role, NEW.email, NULL, NULL)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 