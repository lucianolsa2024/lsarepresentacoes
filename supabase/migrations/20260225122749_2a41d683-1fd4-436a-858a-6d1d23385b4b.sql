
-- Add owner_email to visit_routes
ALTER TABLE visit_routes ADD COLUMN owner_email text;

-- Backfill visit_routes owner_email from route_visits -> clients
UPDATE visit_routes vr
SET owner_email = (
  SELECT c.owner_email FROM route_visits rv
  JOIN clients c ON c.id = rv.client_id
  WHERE rv.route_id = vr.id AND c.owner_email IS NOT NULL
  LIMIT 1
)
WHERE vr.owner_email IS NULL;

-- Drop old policies on visit_routes
DROP POLICY IF EXISTS "Routes are viewable by authenticated users" ON visit_routes;
DROP POLICY IF EXISTS "Authenticated users can insert routes" ON visit_routes;
DROP POLICY IF EXISTS "Authenticated users can update routes" ON visit_routes;
DROP POLICY IF EXISTS "Admins can delete routes" ON visit_routes;

-- New visit_routes policies
CREATE POLICY "routes_select_own_or_admin" ON visit_routes FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR owner_email = (auth.jwt() ->> 'email')
  OR owner_email IS NULL
);

CREATE POLICY "routes_insert_authenticated" ON visit_routes FOR INSERT
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "routes_update_own_or_admin" ON visit_routes FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR owner_email = (auth.jwt() ->> 'email')
  OR owner_email IS NULL
);

CREATE POLICY "routes_delete_admin" ON visit_routes FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Drop old policies on route_visits
DROP POLICY IF EXISTS "Visits are viewable by authenticated users" ON route_visits;
DROP POLICY IF EXISTS "Authenticated users can insert visits" ON route_visits;
DROP POLICY IF EXISTS "Authenticated users can update visits" ON route_visits;
DROP POLICY IF EXISTS "Admins can delete visits" ON route_visits;

-- route_visits: use route ownership via join
CREATE POLICY "route_visits_select_own_or_admin" ON route_visits FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM visit_routes vr
    WHERE vr.id = route_visits.route_id
    AND (vr.owner_email = (auth.jwt() ->> 'email') OR vr.owner_email IS NULL)
  )
);

CREATE POLICY "route_visits_insert_authenticated" ON route_visits FOR INSERT
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "route_visits_update_own_or_admin" ON route_visits FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM visit_routes vr
    WHERE vr.id = route_visits.route_id
    AND (vr.owner_email = (auth.jwt() ->> 'email') OR vr.owner_email IS NULL)
  )
);

CREATE POLICY "route_visits_delete_admin" ON route_visits FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
