-- Enable RLS on pnms table
ALTER TABLE pnms ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to select PNMs
CREATE POLICY "Allow authenticated users to select PNMs"
ON pnms FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow authenticated users to update PNMs
CREATE POLICY "Allow authenticated users to update PNMs"
ON pnms FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy to allow authenticated users to insert PNMs
CREATE POLICY "Allow authenticated users to insert PNMs"
ON pnms FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow authenticated users to delete PNMs
CREATE POLICY "Allow authenticated users to delete PNMs"
ON pnms FOR DELETE
TO authenticated
USING (true);

-- Create storage bucket for PNM photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('pnm-photos', 'pnm-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload photos
CREATE POLICY "Allow authenticated users to upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pnm-photos' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow public access to view photos
CREATE POLICY "Allow public access to view photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pnm-photos');

-- Create policy to allow authenticated users to update photos
CREATE POLICY "Allow authenticated users to update photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pnm-photos')
WITH CHECK (bucket_id = 'pnm-photos');

-- Create policy to allow authenticated users to delete photos
CREATE POLICY "Allow authenticated users to delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pnm-photos'); 