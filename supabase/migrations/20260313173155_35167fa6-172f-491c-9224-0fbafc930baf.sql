
CREATE TABLE public.commission_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido text NOT NULL,
  numero_nf text NOT NULL,
  cliente text NOT NULL,
  representante text NOT NULL,
  tabela_preco text,
  cond_pgto text,
  dt_fat date NOT NULL,
  parcela_idx integer NOT NULL,
  total_parcelas integer NOT NULL,
  vencimento date NOT NULL,
  valor_parcela numeric NOT NULL DEFAULT 0,
  taxa_comissao numeric NOT NULL DEFAULT 0,
  comissao_calculada numeric NOT NULL DEFAULT 0,
  status_parcela text NOT NULL DEFAULT 'pendente',
  status_conciliacao text NOT NULL DEFAULT 'nao_conciliado',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (numero_pedido, numero_nf, parcela_idx)
);

ALTER TABLE public.commission_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_installments_select_admin"
  ON public.commission_installments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "commission_installments_insert_admin"
  ON public.commission_installments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "commission_installments_update_admin"
  ON public.commission_installments FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "commission_installments_delete_admin"
  ON public.commission_installments FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_commission_installments_updated_at
  BEFORE UPDATE ON public.commission_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
