-- Deny all client-side role modifications on user_roles
-- Roles should only be assigned via direct SQL by a database admin

CREATE POLICY "No client INSERT on roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No client UPDATE on roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No client DELETE on roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);