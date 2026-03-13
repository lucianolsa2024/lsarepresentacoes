
-- Add new columns to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS site text,
  ADD COLUMN IF NOT EXISTS segment text,
  ADD COLUMN IF NOT EXISTS default_payment_terms text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Create client_representatives junction table (multiple reps per client)
CREATE TABLE public.client_representatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  representative_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, representative_email)
);

ALTER TABLE public.client_representatives ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated can read, admins + assigned reps can manage
CREATE POLICY "client_reps_select_authenticated" ON public.client_representatives
  FOR SELECT TO authenticated USING (auth.role() = 'authenticated');

CREATE POLICY "client_reps_insert_authenticated" ON public.client_representatives
  FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "client_reps_update_admin" ON public.client_representatives
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "client_reps_delete_admin" ON public.client_representatives
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR representative_email = (auth.jwt() ->> 'email'));

-- Create client_influencers table
CREATE TABLE public.client_influencers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  phone text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_influencers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "influencers_select_authenticated" ON public.client_influencers
  FOR SELECT TO authenticated USING (auth.role() = 'authenticated');

CREATE POLICY "influencers_insert_authenticated" ON public.client_influencers
  FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "influencers_update_authenticated" ON public.client_influencers
  FOR UPDATE TO authenticated USING (auth.role() = 'authenticated');

CREATE POLICY "influencers_delete_authenticated" ON public.client_influencers
  FOR DELETE TO authenticated USING (auth.role() = 'authenticated');

-- Migrate existing owner_email data to client_representatives
INSERT INTO public.client_representatives (client_id, representative_email)
SELECT id, owner_email FROM public.clients WHERE owner_email IS NOT NULL
ON CONFLICT DO NOTHING;

-- Create segments table for dynamic segment management
CREATE TABLE public.client_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "segments_select_authenticated" ON public.client_segments
  FOR SELECT TO authenticated USING (auth.role() = 'authenticated');

CREATE POLICY "segments_insert_authenticated" ON public.client_segments
  FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');

-- Seed default segments
INSERT INTO public.client_segments (name) VALUES
  ('Escritório de Arquitetura'),
  ('Construtora'),
  ('Incorporadora'),
  ('Hotelaria'),
  ('Lojista de Alto Padrão'),
  ('Lojista de Médio Padrão')
ON CONFLICT DO NOTHING;

-- Update clients RLS to also check client_representatives for rep access
DROP POLICY IF EXISTS "clients_select_own_or_admin" ON public.clients;
CREATE POLICY "clients_select_own_or_admin" ON public.clients
  FOR SELECT TO public
  USING (
    has_role(auth.uid(), 'admin')
    OR owner_email = (auth.jwt() ->> 'email')
    OR owner_email IS NULL
    OR EXISTS (
      SELECT 1 FROM public.client_representatives cr
      WHERE cr.client_id = clients.id
      AND cr.representative_email = (auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "clients_update_own_or_admin" ON public.clients;
CREATE POLICY "clients_update_own_or_admin" ON public.clients
  FOR UPDATE TO public
  USING (
    has_role(auth.uid(), 'admin')
    OR owner_email = (auth.jwt() ->> 'email')
    OR owner_email IS NULL
    OR EXISTS (
      SELECT 1 FROM public.client_representatives cr
      WHERE cr.client_id = clients.id
      AND cr.representative_email = (auth.jwt() ->> 'email')
    )
  );
