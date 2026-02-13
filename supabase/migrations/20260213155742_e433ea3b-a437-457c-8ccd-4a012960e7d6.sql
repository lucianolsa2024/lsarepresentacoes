-- Create storage bucket for checklist photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('checklist-photos', 'checklist-photos', true);

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload checklist photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'checklist-photos' AND auth.role() = 'authenticated');

-- Allow public read
CREATE POLICY "Checklist photos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'checklist-photos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete checklist photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'checklist-photos' AND auth.role() = 'authenticated');