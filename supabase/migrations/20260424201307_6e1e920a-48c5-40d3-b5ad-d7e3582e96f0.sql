-- 1) Corrigir owner_email dos pedidos da Juliana que foram importados pelo Luciano
UPDATE public.orders
   SET owner_email = 'comercial@lsarepresentacoes.com.br'
 WHERE representative = 'JULIANA CECCONI'
   AND owner_email = 'lucianoabreu@lsarepresentacoes.com.br';

-- 2) Activities: política mais estrita (sem brecha de NULL, sem regra por owner_email do client)
DROP POLICY IF EXISTS activities_select_own_client_or_assigned_or_admin ON public.activities;
DROP POLICY IF EXISTS activities_update_own_client_or_assigned_or_admin ON public.activities;

CREATE POLICY activities_select_assigned_or_admin
  ON public.activities FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR assigned_to_email = (auth.jwt() ->> 'email')
  );

CREATE POLICY activities_update_assigned_or_admin
  ON public.activities FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR assigned_to_email = (auth.jwt() ->> 'email')
  );

-- 3) Quotes: remover brecha de owner_email NULL
DROP POLICY IF EXISTS quotes_select_own_or_admin ON public.quotes;
DROP POLICY IF EXISTS quotes_update_own_or_admin ON public.quotes;

CREATE POLICY quotes_select_own_or_admin
  ON public.quotes FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR owner_email = (auth.jwt() ->> 'email')
  );

CREATE POLICY quotes_update_own_or_admin
  ON public.quotes FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR owner_email = (auth.jwt() ->> 'email')
  );

-- 4) Orders: incluir match via representatives_map
DROP POLICY IF EXISTS orders_select_own_or_admin ON public.orders;
DROP POLICY IF EXISTS orders_update_own_or_admin ON public.orders;

CREATE POLICY orders_select_own_or_admin
  ON public.orders FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR owner_email = (auth.jwt() ->> 'email')
    OR EXISTS (
      SELECT 1 FROM public.representatives_map rm
       WHERE rm.email = (auth.jwt() ->> 'email')
         AND rm.representative_name = orders.representative
    )
  );

CREATE POLICY orders_update_own_or_admin
  ON public.orders FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR owner_email = (auth.jwt() ->> 'email')
    OR EXISTS (
      SELECT 1 FROM public.representatives_map rm
       WHERE rm.email = (auth.jwt() ->> 'email')
         AND rm.representative_name = orders.representative
    )
  );