-- Revert create_user_metadata trigger function to avoid including first_name and last_name (they will default to NULL)
CREATE OR REPLACE FUNCTION create_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users_metadata (id, role, email)
  VALUES (NEW.id, 'pending'::user_role, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 