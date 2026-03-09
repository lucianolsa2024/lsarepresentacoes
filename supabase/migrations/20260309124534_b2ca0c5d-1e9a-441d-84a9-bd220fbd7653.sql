ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS curve text DEFAULT 'D';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS curve_updated_at timestamptz;