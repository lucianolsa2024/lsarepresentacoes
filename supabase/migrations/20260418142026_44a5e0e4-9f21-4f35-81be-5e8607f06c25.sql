-- 1) alertas: enable RLS, restrict to admins for mutations; authenticated can read
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alertas_select_authenticated"
ON public.alertas FOR SELECT TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "alertas_insert_admin"
ON public.alertas FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "alertas_update_admin"
ON public.alertas FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "alertas_delete_admin"
ON public.alertas FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) metas: enable RLS, authenticated read; admin-only mutations
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metas_select_authenticated"
ON public.metas FOR SELECT TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "metas_insert_admin"
ON public.metas FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "metas_update_admin"
ON public.metas FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "metas_delete_admin"
ON public.metas FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) Tighten anonymous NPS insert: require a valid, unsubmitted training token
DROP POLICY IF EXISTS anon_insert_nps ON public.nps_responses;

CREATE POLICY "anon_insert_nps_with_valid_token"
ON public.nps_responses FOR INSERT TO anon
WITH CHECK (
  training_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.store_trainings st
    WHERE st.id = nps_responses.training_id
      AND st.client_id = nps_responses.client_id
      AND st.nps_token IS NOT NULL
      AND st.nps_submitted = false
  )
);