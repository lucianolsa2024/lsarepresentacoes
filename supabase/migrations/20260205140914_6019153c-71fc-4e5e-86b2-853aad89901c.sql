-- Tabela de rotas de visita
CREATE TABLE public.visit_routes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'planejada' CHECK (status IN ('planejada', 'em_andamento', 'concluida')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de visitas individuais
CREATE TABLE public.route_visits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id uuid REFERENCES public.visit_routes(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  visit_date date NOT NULL,
  visit_order integer DEFAULT 1,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'realizada', 'cancelada')),
  notes text,
  check_in_at timestamptz,
  check_out_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visit_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for visit_routes
CREATE POLICY "Routes are viewable by authenticated users"
ON public.visit_routes FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert routes"
ON public.visit_routes FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update routes"
ON public.visit_routes FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete routes"
ON public.visit_routes FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for route_visits
CREATE POLICY "Visits are viewable by authenticated users"
ON public.route_visits FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert visits"
ON public.route_visits FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update visits"
ON public.route_visits FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete visits"
ON public.route_visits FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on visit_routes
CREATE TRIGGER update_visit_routes_updated_at
BEFORE UPDATE ON public.visit_routes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();