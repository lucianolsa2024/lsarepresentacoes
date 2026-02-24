
-- 1. Add reschedule history (array of dates) and fabric arrival date to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reschedule_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fabric_arrival_date date;

-- 2. Create activity attachments table for assistance images
CREATE TABLE public.activity_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attachments viewable by authenticated"
ON public.activity_attachments FOR SELECT
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Attachments insertable by authenticated"
ON public.activity_attachments FOR INSERT
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Attachments deletable by authenticated"
ON public.activity_attachments FOR DELETE
USING (auth.role() = 'authenticated'::text);

-- 3. Create storage bucket for assistance attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('assistance-attachments', 'assistance-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Assistance attachments are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'assistance-attachments');

CREATE POLICY "Authenticated users can upload assistance attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assistance-attachments' AND auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can delete assistance attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'assistance-attachments' AND auth.role() = 'authenticated'::text);
