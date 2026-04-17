-- 1) sell_in: dados financeiros — restringir a autenticados; delete só admin
ALTER TABLE public.sell_in ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sell_in_select_authenticated"
ON public.sell_in
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "sell_in_insert_authenticated"
ON public.sell_in
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "sell_in_update_authenticated"
ON public.sell_in
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "sell_in_delete_admin"
ON public.sell_in
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) representantes: cadastro — leitura por autenticados; mutações só admin
ALTER TABLE public.representantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "representantes_select_authenticated"
ON public.representantes
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "representantes_insert_admin"
ON public.representantes
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "representantes_update_admin"
ON public.representantes
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "representantes_delete_admin"
ON public.representantes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) representadas: cadastro — leitura por autenticados; mutações só admin
ALTER TABLE public.representadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "representadas_select_authenticated"
ON public.representadas
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "representadas_insert_admin"
ON public.representadas
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "representadas_update_admin"
ON public.representadas
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "representadas_delete_admin"
ON public.representadas
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));