
-- 1. Create orders_history with same structure as orders
CREATE TABLE public.orders_history (LIKE public.orders INCLUDING ALL);

-- 2. Move old orders (before 2026) to history
INSERT INTO public.orders_history
SELECT * FROM public.orders
WHERE issue_date < '2026-01-01';

DELETE FROM public.orders
WHERE issue_date < '2026-01-01';

-- 3. Recreate v_sales_base to union both tables
CREATE OR REPLACE VIEW public.v_sales_base AS
WITH latest_client_rep AS (
  SELECT DISTINCT ON (cr.client_id)
    cr.client_id,
    cr.representative_email
  FROM public.client_representatives cr
  ORDER BY cr.client_id, cr.created_at DESC
),
all_orders AS (
  SELECT id, issue_date, client_id, client_name, supplier, representative, owner_email, order_number, quantity, price, status
  FROM public.orders
  UNION ALL
  SELECT id, issue_date, client_id, client_name, supplier, representative, owner_email, order_number, quantity, price, status
  FROM public.orders_history
)
SELECT
  o.id,
  o.issue_date,
  date_trunc('month', o.issue_date::timestamp with time zone)::date AS month_ref,
  EXTRACT(year FROM o.issue_date)::integer AS year_ref,
  EXTRACT(month FROM o.issue_date)::integer AS month_num,
  o.client_id,
  COALESCE(c.trade_name, c.company, o.client_name) AS client_name,
  upper(trim(both from COALESCE(o.supplier, 'SEM FORNECEDOR'))) AS supplier,
  upper(trim(both from COALESCE(o.representative, 'SEM REPRESENTANTE'))) AS representative,
  COALESCE(lcr.representative_email, c.owner_email, o.owner_email) AS owner_email,
  COALESCE(o.order_number, 'SEM_PEDIDO') AS order_number,
  COALESCE(o.quantity, 0) AS quantity,
  COALESCE(o.price, 0::numeric) AS price,
  COALESCE(o.price, 0::numeric) AS line_revenue,
  CASE
    WHEN COALESCE(o.status, '') ILIKE 'faturado'
      OR COALESCE(o.status, '') ILIKE 'entregue'
    THEN 'faturado'
    ELSE 'carteira'
  END AS revenue_status
FROM all_orders o
LEFT JOIN public.clients c ON c.id = o.client_id
LEFT JOIN latest_client_rep lcr ON lcr.client_id = o.client_id;

ALTER VIEW public.v_sales_base SET (security_invoker = true);

-- 4. RLS on orders_history (read-only for authenticated, admin can manage)
ALTER TABLE public.orders_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "history_select_authenticated" ON public.orders_history
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "history_insert_admin" ON public.orders_history
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "history_delete_admin" ON public.orders_history
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "history_update_admin" ON public.orders_history
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
