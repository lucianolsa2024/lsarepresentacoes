-- Enable RLS on showroom_tracking
ALTER TABLE public.showroom_tracking ENABLE ROW LEVEL SECURITY;

-- SELECT policy: admin or matching representative via representatives_map
CREATE POLICY showroom_select_own_or_admin
ON public.showroom_tracking
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.representatives_map rm
    WHERE rm.email = (auth.jwt() ->> 'email')
      AND rm.representative_name = showroom_tracking.representante
  )
);

-- INSERT/UPDATE/DELETE: admin only
CREATE POLICY showroom_insert_admin
ON public.showroom_tracking
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY showroom_update_own_or_admin
ON public.showroom_tracking
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.representatives_map rm
    WHERE rm.email = (auth.jwt() ->> 'email')
      AND rm.representative_name = showroom_tracking.representante
  )
);

CREATE POLICY showroom_delete_admin
ON public.showroom_tracking
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Recreate views with security_invoker so they respect RLS
DROP VIEW IF EXISTS public.vw_showroom_acompanhamento;
CREATE VIEW public.vw_showroom_acompanhamento
WITH (security_invoker=on) AS
SELECT id,
       nf_numero,
       dt_faturamento,
       cliente,
       segmento_cliente,
       produto,
       cidade,
       representante,
       quantidade,
       valor,
       status_exposicao,
       status_treinamento,
       data_confirmacao,
       observacao,
       (CURRENT_DATE - dt_faturamento) AS dias_desde_fat,
       CASE
         WHEN status_exposicao = 'exposto' THEN 'ok'
         WHEN status_exposicao = 'substituido' THEN 'ok'
         WHEN (CURRENT_DATE - dt_faturamento) <= 7 THEN 'verde'
         WHEN (CURRENT_DATE - dt_faturamento) <= 15 THEN 'amarelo'
         ELSE 'vermelho'
       END AS urgencia,
       CASE
         WHEN status_exposicao = 'exposto' AND status_treinamento = 'pendente' THEN true
         ELSE false
       END AS treinamento_pendente
FROM public.showroom_tracking
WHERE segmento_cliente <> 'CORPORATIVO' AND segmento_cliente IS NOT NULL
ORDER BY
  CASE status_exposicao
    WHEN 'pendente' THEN 1
    WHEN 'nao_exposto' THEN 2
    WHEN 'agendado' THEN 3
    ELSE 4
  END,
  (CURRENT_DATE - dt_faturamento) DESC;

DROP VIEW IF EXISTS public.vw_showroom_resumo_rep;
CREATE VIEW public.vw_showroom_resumo_rep
WITH (security_invoker=on) AS
SELECT representante,
       count(*) AS total_itens,
       count(DISTINCT cliente) AS total_clientes,
       sum(valor) AS valor_total,
       count(CASE WHEN status_exposicao = 'pendente' THEN 1 END) AS pendentes,
       count(CASE WHEN status_exposicao = 'exposto' THEN 1 END) AS expostos,
       count(CASE WHEN status_exposicao = 'nao_exposto' THEN 1 END) AS nao_expostos,
       count(CASE WHEN status_exposicao = 'pendente' AND (CURRENT_DATE - dt_faturamento) > 15 THEN 1 END) AS urgentes,
       round(((count(CASE WHEN status_exposicao = 'exposto' THEN 1 END))::numeric
              / NULLIF(count(*), 0)::numeric) * 100, 1) AS taxa_exposicao_pct,
       count(CASE WHEN status_exposicao = 'exposto' AND status_treinamento = 'pendente' THEN 1 END) AS treinamentos_pendentes
FROM public.showroom_tracking
WHERE segmento_cliente <> 'CORPORATIVO' AND segmento_cliente IS NOT NULL
GROUP BY representante
ORDER BY
  count(CASE WHEN status_exposicao = 'pendente' AND (CURRENT_DATE - dt_faturamento) > 15 THEN 1 END) DESC,
  count(CASE WHEN status_exposicao = 'pendente' THEN 1 END) DESC;