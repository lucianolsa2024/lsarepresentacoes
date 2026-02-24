
-- Sequence for OS numbers
CREATE SEQUENCE IF NOT EXISTS public.service_order_seq START 1;

-- Main service_orders table
CREATE TABLE public.service_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  os_number text NOT NULL DEFAULT 'OS-' || lpad(nextval('public.service_order_seq')::text, 4, '0'),
  product text,
  responsible_type text NOT NULL DEFAULT 'Fabrica',
  responsible_name text,
  has_rt boolean NOT NULL DEFAULT false,
  rt_percentage numeric DEFAULT 0,
  origin_nf text,
  defect text,
  labor_cost numeric NOT NULL DEFAULT 0,
  supplies_cost numeric NOT NULL DEFAULT 0,
  freight_cost numeric NOT NULL DEFAULT 0,
  net_result numeric NOT NULL DEFAULT 0,
  delivery_forecast date,
  status text NOT NULL DEFAULT 'Aguardando',
  exit_nf text,
  boleto_info text,
  supplies_nf_url text,
  supplies_nf_data jsonb,
  client_id uuid REFERENCES public.clients(id),
  owner_email text,
  change_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Photos table
CREATE TABLE public.service_order_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  photo_type text NOT NULL DEFAULT 'recebimento',
  file_url text NOT NULL,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('service-order-files', 'service-order-files', true);

-- Enable RLS
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_photos ENABLE ROW LEVEL SECURITY;

-- RLS for service_orders
CREATE POLICY "so_select_own_or_admin" ON public.service_orders
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR owner_email = (auth.jwt() ->> 'email'::text)
  );

CREATE POLICY "so_insert_authenticated" ON public.service_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "so_update_own_or_admin" ON public.service_orders
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR owner_email = (auth.jwt() ->> 'email'::text)
  );

CREATE POLICY "so_delete_admin" ON public.service_orders
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for service_order_photos
CREATE POLICY "sop_select_authenticated" ON public.service_order_photos
  FOR SELECT USING (auth.role() = 'authenticated'::text);

CREATE POLICY "sop_insert_authenticated" ON public.service_order_photos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "sop_delete_authenticated" ON public.service_order_photos
  FOR DELETE USING (auth.role() = 'authenticated'::text);

-- Storage policies
CREATE POLICY "so_files_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'service-order-files');

CREATE POLICY "so_files_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'service-order-files' AND auth.role() = 'authenticated'::text);

CREATE POLICY "so_files_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'service-order-files' AND auth.role() = 'authenticated'::text);

-- Updated_at trigger
CREATE TRIGGER update_service_orders_updated_at
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
