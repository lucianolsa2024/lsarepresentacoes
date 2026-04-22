-- 1) Bank accounts
CREATE TABLE public.finance_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bank_name TEXT,
  agency TEXT,
  account_number TEXT,
  account_type TEXT NOT NULL DEFAULT 'corrente',
  company_id UUID REFERENCES public.finance_companies(id) ON DELETE SET NULL,
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LSA finance: select bank accounts"
  ON public.finance_bank_accounts FOR SELECT
  USING (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: insert bank accounts"
  ON public.finance_bank_accounts FOR INSERT
  WITH CHECK (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: update bank accounts"
  ON public.finance_bank_accounts FOR UPDATE
  USING (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: delete bank accounts"
  ON public.finance_bank_accounts FOR DELETE
  USING (public.is_finance_lsa_user());

CREATE TRIGGER trg_finance_bank_accounts_updated
  BEFORE UPDATE ON public.finance_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Bank transactions (rows from OFX/CSV imports)
CREATE TABLE public.finance_bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES public.finance_bank_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'debit', -- debit | credit
  fitid TEXT, -- bank-provided unique id (OFX FITID)
  memo TEXT,
  balance_after NUMERIC,
  reconciliation_status TEXT NOT NULL DEFAULT 'pendente', -- pendente | conciliado | ignorado
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'manual', -- ofx | csv | manual | api
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_bank_tx_unique_fitid
  ON public.finance_bank_transactions(bank_account_id, fitid)
  WHERE fitid IS NOT NULL;

CREATE INDEX idx_bank_tx_account_date
  ON public.finance_bank_transactions(bank_account_id, transaction_date);

CREATE INDEX idx_bank_tx_status
  ON public.finance_bank_transactions(reconciliation_status);

ALTER TABLE public.finance_bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LSA finance: select bank tx"
  ON public.finance_bank_transactions FOR SELECT
  USING (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: insert bank tx"
  ON public.finance_bank_transactions FOR INSERT
  WITH CHECK (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: update bank tx"
  ON public.finance_bank_transactions FOR UPDATE
  USING (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: delete bank tx"
  ON public.finance_bank_transactions FOR DELETE
  USING (public.is_finance_lsa_user());

CREATE TRIGGER trg_finance_bank_tx_updated
  BEFORE UPDATE ON public.finance_bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Reconciliations (link bank tx <-> finance_entry)
CREATE TABLE public.finance_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_transaction_id UUID NOT NULL REFERENCES public.finance_bank_transactions(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.finance_entries(id) ON DELETE CASCADE,
  match_score NUMERIC,
  match_type TEXT NOT NULL DEFAULT 'manual', -- manual | auto | suggested
  confirmed_by TEXT,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bank_transaction_id, entry_id)
);

CREATE INDEX idx_reconciliations_bank_tx ON public.finance_reconciliations(bank_transaction_id);
CREATE INDEX idx_reconciliations_entry ON public.finance_reconciliations(entry_id);

ALTER TABLE public.finance_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LSA finance: select reconciliations"
  ON public.finance_reconciliations FOR SELECT
  USING (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: insert reconciliations"
  ON public.finance_reconciliations FOR INSERT
  WITH CHECK (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: update reconciliations"
  ON public.finance_reconciliations FOR UPDATE
  USING (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: delete reconciliations"
  ON public.finance_reconciliations FOR DELETE
  USING (public.is_finance_lsa_user());