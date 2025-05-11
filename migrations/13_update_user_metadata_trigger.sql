-- Update trigger to store first and last name from auth.users.raw_user_meta_data
CREATE OR REPLACE FUNCTION public.create_user_metadata()
RETURNS TRIGGER AS $$
DECLARE
  f_name TEXT;
  l_name TEXT;
BEGIN
  -- Extract from raw_user_meta_data JSON, keys may be absent
  f_name := NEW.raw_user_meta_data ->> 'first_name';
  l_name := NEW.raw_user_meta_data ->> 'last_name';

  INSERT INTO public.users_metadata (id, role, email, first_name, last_name)
  VALUES (NEW.id, 'pending'::public.user_role, NEW.email, f_name, l_name)
  ON CONFLICT (id) DO UPDATE
    SET first_name = COALESCE(EXCLUDED.first_name, users_metadata.first_name),
        last_name  = COALESCE(EXCLUDED.last_name, users_metadata.last_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 