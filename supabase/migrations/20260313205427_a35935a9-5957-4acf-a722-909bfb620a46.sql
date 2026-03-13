
DROP POLICY IF EXISTS "activities_update_own_client_or_assigned_or_admin" ON public.activities;

CREATE POLICY "activities_update_own_client_or_assigned_or_admin"
ON public.activities
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (assigned_to_email = (auth.jwt() ->> 'email'::text))
  OR ((client_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = activities.client_id AND clients.owner_email = (auth.jwt() ->> 'email'::text)
  )))
  OR ((client_id IS NULL) AND (assigned_to_email IS NULL))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (assigned_to_email = (auth.jwt() ->> 'email'::text))
  OR ((client_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = activities.client_id AND clients.owner_email = (auth.jwt() ->> 'email'::text)
  )))
  OR ((client_id IS NULL) AND (assigned_to_email IS NULL))
);
