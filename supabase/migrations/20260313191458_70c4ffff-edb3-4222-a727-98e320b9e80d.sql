
-- Add portfolio_status to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portfolio_status text DEFAULT 'prospeccao';

-- Store trainings
CREATE TABLE public.store_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  training_date date NOT NULL,
  trainer_email text NOT NULL,
  collection text,
  observations text,
  created_at timestamptz DEFAULT now()
);

-- Training participants
CREATE TABLE public.training_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid REFERENCES public.store_trainings(id) ON DELETE CASCADE NOT NULL,
  consultant_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- NPS responses
CREATE TABLE public.nps_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  training_id uuid REFERENCES public.store_trainings(id) ON DELETE SET NULL,
  consultant_name text NOT NULL,
  trainer_email text,
  score_1 integer NOT NULL DEFAULT 0,
  score_2 integer NOT NULL DEFAULT 0,
  score_3 integer NOT NULL DEFAULT 0,
  score_4 integer NOT NULL DEFAULT 0,
  score_5 integer NOT NULL DEFAULT 0,
  comment text,
  response_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.store_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

-- store_trainings policies
CREATE POLICY "trainings_select_authenticated" ON public.store_trainings FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "trainings_insert_authenticated" ON public.store_trainings FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "trainings_update_authenticated" ON public.store_trainings FOR UPDATE TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "trainings_delete_admin" ON public.store_trainings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- training_participants policies
CREATE POLICY "tp_select_authenticated" ON public.training_participants FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "tp_insert_authenticated" ON public.training_participants FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "tp_update_authenticated" ON public.training_participants FOR UPDATE TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "tp_delete_authenticated" ON public.training_participants FOR DELETE TO authenticated USING (auth.role() = 'authenticated');

-- nps_responses policies
CREATE POLICY "nps_select_authenticated" ON public.nps_responses FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "nps_insert_authenticated" ON public.nps_responses FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "nps_update_authenticated" ON public.nps_responses FOR UPDATE TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "nps_delete_admin" ON public.nps_responses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
