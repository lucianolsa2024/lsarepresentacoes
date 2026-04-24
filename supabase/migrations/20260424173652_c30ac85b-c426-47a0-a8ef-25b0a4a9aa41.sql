-- Permite múltiplas metas (Total + por fábrica) para mesmo rep/mês
ALTER TABLE public.rep_goals DROP CONSTRAINT IF EXISTS rep_goals_pkey;

-- Nova PK surrogate
ALTER TABLE public.rep_goals ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.rep_goals ADD PRIMARY KEY (id);

-- Garante unicidade lógica (owner, mês, fábrica) — NULL tratado como string vazia
DROP INDEX IF EXISTS rep_goals_owner_month_supplier_uidx;
CREATE UNIQUE INDEX rep_goals_owner_month_supplier_uidx
  ON public.rep_goals (owner_email, month_start, COALESCE(supplier, ''));