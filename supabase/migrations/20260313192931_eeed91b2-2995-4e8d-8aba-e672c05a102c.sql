
-- Allow anonymous users to read a training by its token (for the public NPS form)
CREATE POLICY "anon_select_by_token" ON public.store_trainings
  FOR SELECT TO anon
  USING (nps_token IS NOT NULL AND nps_submitted = false);

-- Allow anonymous users to insert NPS responses (from the public form)
CREATE POLICY "anon_insert_nps" ON public.nps_responses
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anonymous to read clients for the store selector on the public form
CREATE POLICY "anon_select_clients_company" ON public.clients
  FOR SELECT TO anon
  USING (true);

-- Allow anonymous to update nps_submitted flag on store_trainings
CREATE POLICY "anon_update_nps_submitted" ON public.store_trainings
  FOR UPDATE TO anon
  USING (nps_token IS NOT NULL AND nps_submitted = false)
  WITH CHECK (nps_submitted = true);
