-- Helper function: valida acesso à área financeira da LSA
CREATE OR REPLACE FUNCTION public.is_finance_lsa_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) = 'lucianoabreu@lsarepresentacoes.com.br'
      AND public.has_role(u.id, 'admin'::app_role)
  );
$$;

-- Empresas (entidades financeiras)
CREATE TABLE public.finance_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'pj' CHECK (entity_type IN ('pj','pf')),
  document TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LSA finance: select companies"
  ON public.finance_companies FOR SELECT
  USING (public.is_finance_lsa_user());

CREATE POLICY "LSA finance: insert companies"
  ON public.finance_companies FOR INSERT
  WITH CHECK (public.is_finance_lsa_user());

CREATE POLICY "LSA finance: update companies"
  ON public.finance_companies FOR UPDATE
  USING (public.is_finance_lsa_user());

CREATE POLICY "LSA finance: delete companies"
  ON public.finance_companies FOR DELETE
  USING (public.is_finance_lsa_user());

CREATE TRIGGER trg_finance_companies_updated_at
  BEFORE UPDATE ON public.finance_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Categorias
CREATE TABLE public.finance_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL DEFAULT 'despesa' CHECK (category_type IN ('despesa','receita','ambos')),
  color TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LSA finance: select categories"
  ON public.finance_categories FOR SELECT
  USING (public.is_finance_lsa_user());

CREATE POLICY "LSA finance: insert categories"
  ON public.finance_categories FOR INSERT
  WITH CHECK (public.is_finance_lsa_user());

CREATE POLICY "LSA finance: update categories"
  ON public.finance_categories FOR UPDATE
  USING (public.is_finance_lsa_user());

CREATE POLICY "LSA finance: delete categories"
  ON public.finance_categories FOR DELETE
  USING (public.is_finance_lsa_user());

CREATE TRIGGER trg_finance_categories_updated_at
  BEFORE UPDATE ON public.finance_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lançamentos (uma linha por parcela)
CREATE TABLE public.finance_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('a_pagar','a_receber')),
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','vencido','cancelado')),
  category_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.finance_companies(id) ON DELETE SET NULL,
  counterparty TEXT,                -- cliente (a_receber) ou fornecedor (a_pagar)
  payment_method TEXT,              -- forma de pagamento (boleto, pix, cartão, etc)
  notes TEXT,
  cost_center TEXT,
  document TEXT,                    -- nº doc/NF
  installment_index INT NOT NULL DEFAULT 1,
  installment_total INT NOT NULL DEFAULT 1,
  recurrence_id UUID,               -- agrupa lançamentos recorrentes
  recurrence_rule TEXT CHECK (recurrence_rule IN ('mensal','anual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_entries_due ON public.finance_entries(due_date);
CREATE INDEX idx_finance_entries_status ON public.finance_entries(status);
CREATE INDEX idx_finance_entries_type ON public.finance_entries(entry_type);
CREATE INDEX idx_finance_entries_company ON public.finance_entries(company_id);
CREATE INDEX idx_finance_entries_category ON public.finance_entries(category_id);
CREATE INDEX idx_finance_entries_recurrence ON public.finance_entries(recurrence_id);

ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LSA finance: select entries"
  ON public.finance_entries FOR SELECT
  USING (public.is_finance_lsa_user());

CREATE POLICY "LSA finance: insert entries"
  ON public.finance_entries FOR INSERT
  WITH CHECK (public.is_finance_lsa_user());

CREATE POLICY "LSA finance: update entries"
  ON public.finance_entries FOR UPDATE
  USING (public.is_finance_lsa_user());

CREATE POLICY "LSA finance: delete entries"
  ON public.finance_entries FOR DELETE
  USING (public.is_finance_lsa_user());

CREATE TRIGGER trg_finance_entries_updated_at
  BEFORE UPDATE ON public.finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed de categorias
INSERT INTO public.finance_categories (name, category_type, color) VALUES
  ('Aluguel',          'despesa', '#dc2626'),
  ('Fornecedores',     'despesa', '#ea580c'),
  ('Marketing',        'despesa', '#a855f7'),
  ('Comissões',        'despesa', '#0891b2'),
  ('Impostos',         'despesa', '#64748b'),
  ('Folha de Pagamento','despesa','#7c3aed'),
  ('Operacional',      'despesa', '#475569'),
  ('Pró-labore',       'despesa', '#0284c7'),
  ('Vendas',           'receita', '#059669'),
  ('Comissões Recebidas','receita','#16a34a'),
  ('Serviços',         'receita', '#22c55e'),
  ('Outras Receitas',  'receita', '#10b981');

-- Seed de empresas
INSERT INTO public.finance_companies (name, entity_type) VALUES
  ('Empresa A',                'pj'),
  ('Empresa B',                'pj'),
  ('Pessoa Física do Sócio',   'pf');