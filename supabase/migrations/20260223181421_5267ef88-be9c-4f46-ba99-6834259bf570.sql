
-- 1. Add owner_email to quotes and sales_opportunities
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS owner_email text;
ALTER TABLE sales_opportunities ADD COLUMN IF NOT EXISTS owner_email text;

-- 2. Backfill owner_email from clients table
UPDATE quotes q SET owner_email = c.owner_email 
FROM clients c WHERE q.client_id = c.id AND q.owner_email IS NULL AND c.owner_email IS NOT NULL;

UPDATE sales_opportunities so SET owner_email = c.owner_email 
FROM clients c WHERE so.client_id = c.id AND so.owner_email IS NULL AND c.owner_email IS NOT NULL;

-- 3. RLS: Clients - only own clients or admin (null owner visible to all)
DROP POLICY IF EXISTS "Clients are viewable by authenticated users" ON clients;
CREATE POLICY "clients_select_own_or_admin" ON clients FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR owner_email = (auth.jwt() ->> 'email') 
  OR owner_email IS NULL
);

DROP POLICY IF EXISTS "Authenticated users can update clients" ON clients;
CREATE POLICY "clients_update_own_or_admin" ON clients FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR owner_email = (auth.jwt() ->> 'email') 
  OR owner_email IS NULL
);

-- 4. RLS: Quotes - only own quotes or admin
DROP POLICY IF EXISTS "Quotes are viewable by authenticated users" ON quotes;
CREATE POLICY "quotes_select_own_or_admin" ON quotes FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR owner_email = (auth.jwt() ->> 'email') 
  OR owner_email IS NULL
);

DROP POLICY IF EXISTS "Authenticated users can update quotes" ON quotes;
CREATE POLICY "quotes_update_own_or_admin" ON quotes FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR owner_email = (auth.jwt() ->> 'email') 
  OR owner_email IS NULL
);

-- 5. RLS: Sales opportunities - only own or admin
DROP POLICY IF EXISTS "Opportunities viewable by authenticated" ON sales_opportunities;
CREATE POLICY "opportunities_select_own_or_admin" ON sales_opportunities FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR owner_email = (auth.jwt() ->> 'email') 
  OR owner_email IS NULL
);

DROP POLICY IF EXISTS "Authenticated can update opportunities" ON sales_opportunities;
CREATE POLICY "opportunities_update_own_or_admin" ON sales_opportunities FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR owner_email = (auth.jwt() ->> 'email') 
  OR owner_email IS NULL
);

-- 6. RLS: Activities - see only activities for own clients OR assigned to them OR admin
DROP POLICY IF EXISTS "activities_select_rep_or_assigned" ON activities;
CREATE POLICY "activities_select_own_client_or_assigned_or_admin" ON activities FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR assigned_to_email = (auth.jwt() ->> 'email')
  OR (client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM clients WHERE clients.id = activities.client_id 
    AND clients.owner_email = (auth.jwt() ->> 'email')
  ))
  OR (client_id IS NULL AND assigned_to_email IS NULL)
);

DROP POLICY IF EXISTS "activities_update_rep_or_assigned" ON activities;
CREATE POLICY "activities_update_own_client_or_assigned_or_admin" ON activities FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR assigned_to_email = (auth.jwt() ->> 'email')
  OR (client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM clients WHERE clients.id = activities.client_id 
    AND clients.owner_email = (auth.jwt() ->> 'email')
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR assigned_to_email = (auth.jwt() ->> 'email')
  OR (client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM clients WHERE clients.id = activities.client_id 
    AND clients.owner_email = (auth.jwt() ->> 'email')
  ))
);
