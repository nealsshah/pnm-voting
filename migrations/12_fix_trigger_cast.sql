-- Adjust create_user_metadata to cast enum with schema-qualified type to avoid search_path issues
CREATE OR REPLACE FUNCTION public.create_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_metadata (id, role, email)
  VALUES (NEW.id, 'pending'::public.user_role, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 