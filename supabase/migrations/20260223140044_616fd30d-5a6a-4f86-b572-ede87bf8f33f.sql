
-- Tabela de política de descontos por faixa e prazo de pagamento
CREATE TABLE public.discount_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL, -- 'diamante', 'ouro', 'prata', 'bronze'
  payment_terms text NOT NULL, -- ex: '15 DIAS / ANTECIPADO', '30/60/90 DIAS'
  avg_days integer NOT NULL, -- prazo médio em dias
  discount_pct numeric NOT NULL DEFAULT 0, -- % desconto (negativo = acréscimo)
  created_at timestamptz DEFAULT now(),
  UNIQUE (tier, avg_days)
);

ALTER TABLE public.discount_policies ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler
CREATE POLICY "Discount policies viewable by authenticated"
  ON public.discount_policies FOR SELECT
  USING (auth.role() = 'authenticated');

-- Apenas admins podem modificar
CREATE POLICY "Admins can insert discount policies"
  ON public.discount_policies FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update discount policies"
  ON public.discount_policies FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete discount policies"
  ON public.discount_policies FOR DELETE
  USING (has_role(auth.uid(), 'admin'));
