
-- 1) Add owner_email column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS owner_email text;

-- 2) Create representatives mapping table
CREATE TABLE IF NOT EXISTS public.representatives_map (
  representative_name text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true
);

-- 3) Enable RLS on representatives_map
ALTER TABLE public.representatives_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "representatives_map_select_authenticated"
ON public.representatives_map
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

-- 4) Drop old SELECT and UPDATE policies on orders
DROP POLICY IF EXISTS "Orders viewable by authenticated" ON public.orders;
DROP POLICY IF EXISTS "Authenticated can update orders" ON public.orders;

-- 5) Create new SELECT policy: admin OR owner_email matches
CREATE POLICY "orders_select_own_or_admin"
ON public.orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR owner_email = (auth.jwt() ->> 'email')
);

-- 6) Create new UPDATE policy: admin OR owner_email matches
CREATE POLICY "orders_update_own_or_admin"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR owner_email = (auth.jwt() ->> 'email')
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR owner_email = (auth.jwt() ->> 'email')
);
