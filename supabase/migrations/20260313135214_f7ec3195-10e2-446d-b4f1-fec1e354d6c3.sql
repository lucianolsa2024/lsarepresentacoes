
CREATE TABLE public.commission_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pedido text,
  tabela_preco text,
  dt_emissao date,
  dt_fat date NOT NULL,
  cliente text NOT NULL,
  cond_pgto text,
  numero_pedido text NOT NULL,
  numero_nf text NOT NULL,
  representante_pf text NOT NULL,
  produto_completo text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(numero_pedido, numero_nf, produto_completo, valor, representante_pf)
);

ALTER TABLE public.commission_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_select_admin" ON public.commission_entries
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "commission_insert_admin" ON public.commission_entries
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "commission_delete_admin" ON public.commission_entries
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
