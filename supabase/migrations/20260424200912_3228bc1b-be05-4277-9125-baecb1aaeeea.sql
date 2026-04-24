-- 1) Padronizar grafia de Juliana Cecconi nos pedidos
UPDATE public.orders
   SET representative = 'JULIANA CECCONI'
 WHERE representative IN ('JULIANA CECONI', 'LSA - JULIANA CECCONI');

UPDATE public.orders_history
   SET representative = 'JULIANA CECCONI'
 WHERE representative IN ('JULIANA CECONI', 'LSA - JULIANA CECCONI');

UPDATE public.orders
   SET representative = 'LIVIA MORELLI'
 WHERE representative = 'LÍVIA MORELLI';

UPDATE public.orders_history
   SET representative = 'LIVIA MORELLI'
 WHERE representative = 'LÍVIA MORELLI';

-- 2) Atualizar mapping para refletir grafia oficial
UPDATE public.representatives_map
   SET representative_name = 'JULIANA CECCONI'
 WHERE email = 'comercial@lsarepresentacoes.com.br';

-- 3) Liberar INSERT de produtos/relacionados a usuários autenticados
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Authenticated can insert products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can insert modulations" ON public.product_modulations;
CREATE POLICY "Authenticated can insert modulations"
  ON public.product_modulations FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can insert sizes" ON public.modulation_sizes;
CREATE POLICY "Authenticated can insert sizes"
  ON public.modulation_sizes FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='modulation_finishes') THEN
    EXECUTE 'ALTER TABLE public.modulation_finishes ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Finishes are viewable by everyone" ON public.modulation_finishes';
    EXECUTE 'CREATE POLICY "Finishes are viewable by everyone" ON public.modulation_finishes FOR SELECT USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can insert finishes" ON public.modulation_finishes';
    EXECUTE 'CREATE POLICY "Authenticated can insert finishes" ON public.modulation_finishes FOR INSERT TO authenticated WITH CHECK (auth.role() = ''authenticated'')';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update finishes" ON public.modulation_finishes';
    EXECUTE 'CREATE POLICY "Admins can update finishes" ON public.modulation_finishes FOR UPDATE USING (has_role(auth.uid(), ''admin''::app_role))';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete finishes" ON public.modulation_finishes';
    EXECUTE 'CREATE POLICY "Admins can delete finishes" ON public.modulation_finishes FOR DELETE USING (has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='product_finish_prices') THEN
    EXECUTE 'ALTER TABLE public.product_finish_prices ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Finish prices viewable by everyone" ON public.product_finish_prices';
    EXECUTE 'CREATE POLICY "Finish prices viewable by everyone" ON public.product_finish_prices FOR SELECT USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can insert finish prices" ON public.product_finish_prices';
    EXECUTE 'CREATE POLICY "Authenticated can insert finish prices" ON public.product_finish_prices FOR INSERT TO authenticated WITH CHECK (auth.role() = ''authenticated'')';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update finish prices" ON public.product_finish_prices';
    EXECUTE 'CREATE POLICY "Admins can update finish prices" ON public.product_finish_prices FOR UPDATE USING (has_role(auth.uid(), ''admin''::app_role))';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete finish prices" ON public.product_finish_prices';
    EXECUTE 'CREATE POLICY "Admins can delete finish prices" ON public.product_finish_prices FOR DELETE USING (has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END $$;