
-- 1. Fix calendar_tokens: restrict anon SELECT to token-based lookup only
DROP POLICY IF EXISTS "Anon can select by token for feed" ON public.calendar_tokens;

CREATE POLICY "Anon can select by token for feed"
ON public.calendar_tokens
FOR SELECT TO anon
USING (token = current_setting('request.headers', true)::json->>'x-calendar-token'
  OR token = (regexp_match(current_setting('request.querystring', true), 'token=([^&]+)'))[1]
);

-- 2. Fix okr_goal_activity_types: enable RLS
ALTER TABLE public.okr_goal_activity_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "okr_activity_types_select_own_or_admin"
ON public.okr_goal_activity_types
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.okr_goals g
    WHERE g.id = okr_goal_activity_types.goal_id
      AND (g.owner_email = (auth.jwt() ->> 'email'::text) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "okr_activity_types_insert_admin"
ON public.okr_goal_activity_types
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "okr_activity_types_update_admin"
ON public.okr_goal_activity_types
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "okr_activity_types_delete_admin"
ON public.okr_goal_activity_types
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix clients anon exposure: create a restricted view and drop the broad policy
CREATE OR REPLACE VIEW public.v_clients_for_nps AS
  SELECT id, company FROM public.clients;

GRANT SELECT ON public.v_clients_for_nps TO anon;

DROP POLICY IF EXISTS "anon_select_clients_company" ON public.clients;

-- 4. Fix service-order-files storage: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view service order files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view service order files" ON storage.objects;

CREATE POLICY "Authenticated can view service order files"
ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'service-order-files');
