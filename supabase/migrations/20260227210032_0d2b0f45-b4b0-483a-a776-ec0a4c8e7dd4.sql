ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS nf_number text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS nf_pdf_url text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendente' NOT NULL;