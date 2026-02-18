
-- 1) Add assigned_to_email column to activities
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS assigned_to_email text;

-- 2) Drop old SELECT and UPDATE policies on activities
DROP POLICY IF EXISTS "Activities viewable by authenticated" ON public.activities;
DROP POLICY IF EXISTS "Activities updatable by authenticated" ON public.activities;

-- 3) New SELECT policy:
--    Reps (in representatives_map) see all activities
--    Others see only activities assigned to them
CREATE POLICY "activities_select_rep_or_assigned"
ON public.activities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.representatives_map
    WHERE email = (auth.jwt() ->> 'email')
  )
  OR assigned_to_email = (auth.jwt() ->> 'email')
);

-- 4) New UPDATE policy: same logic
CREATE POLICY "activities_update_rep_or_assigned"
ON public.activities
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.representatives_map
    WHERE email = (auth.jwt() ->> 'email')
  )
  OR assigned_to_email = (auth.jwt() ->> 'email')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.representatives_map
    WHERE email = (auth.jwt() ->> 'email')
  )
  OR assigned_to_email = (auth.jwt() ->> 'email')
);
