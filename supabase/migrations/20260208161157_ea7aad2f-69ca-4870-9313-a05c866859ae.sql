-- Allow authenticated users to upload to pedidos bucket
CREATE POLICY "Authenticated users can upload pedidos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'pedidos' AND auth.role() = 'authenticated');

-- Allow authenticated users to read from pedidos bucket
CREATE POLICY "Authenticated users can read pedidos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'pedidos' AND auth.role() = 'authenticated');