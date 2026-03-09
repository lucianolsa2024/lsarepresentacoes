
CREATE TABLE public.okr_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategic_objective text NOT NULL CHECK (strategic_objective IN ('share_loja', 'reativar_clientes', 'novos_clientes')),
  owner_email text NOT NULL,
  month_start date NOT NULL,
  key_result text NOT NULL,
  metric_type text NOT NULL CHECK (metric_type IN ('absolute', 'percentage', 'currency')),
  monthly_target numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.okr_goals ENABLE ROW LEVEL SECURITY;

-- Admins full CRUD
CREATE POLICY "okr_goals_select_own_or_admin" ON public.okr_goals
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR owner_email = (auth.jwt() ->> 'email')
  );

CREATE POLICY "okr_goals_insert_admin" ON public.okr_goals
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "okr_goals_update_admin" ON public.okr_goals
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "okr_goals_delete_admin" ON public.okr_goals
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Unique constraint: one key_result per rep per month per objective
CREATE UNIQUE INDEX okr_goals_unique ON public.okr_goals (owner_email, month_start, strategic_objective, key_result);
