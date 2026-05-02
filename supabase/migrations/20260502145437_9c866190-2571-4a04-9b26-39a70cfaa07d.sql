-- Enable RLS and add LSA finance policies for finance_cash_entries
ALTER TABLE public.finance_cash_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LSA finance: select cash entries"
ON public.finance_cash_entries FOR SELECT
USING (public.is_finance_lsa_user());

CREATE POLICY "LSA finance: insert cash entries"
ON public.finance_cash_entries FOR INSERT
WITH CHECK (public.is_finance_lsa_user());

CREATE POLICY "LSA finance: update cash entries"
ON public.finance_cash_entries FOR UPDATE
USING (public.is_finance_lsa_user());

CREATE POLICY "LSA finance: delete cash entries"
ON public.finance_cash_entries FOR DELETE
USING (public.is_finance_lsa_user());