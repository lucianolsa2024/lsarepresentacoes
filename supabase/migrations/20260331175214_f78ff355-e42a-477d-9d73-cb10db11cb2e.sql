CREATE OR REPLACE VIEW public.v_sales_base AS
WITH latest_client_rep AS (
  SELECT DISTINCT ON (cr.client_id)
    cr.client_id,
    cr.representative_email
  FROM public.client_representatives cr
  ORDER BY cr.client_id, cr.created_at DESC
)
SELECT
  o.id,
  o.issue_date,
  date_trunc('month', o.issue_date::timestamp with time zone)::date AS month_ref,
  EXTRACT(year FROM o.issue_date)::integer AS year_ref,
  EXTRACT(month FROM o.issue_date)::integer AS month_num,
  o.client_id,
  COALESCE(c.trade_name, c.company, o.client_name) AS client_name,
  upper(TRIM(BOTH FROM COALESCE(o.supplier, 'SEM FORNECEDOR'::text))) AS supplier,
  upper(TRIM(BOTH FROM COALESCE(o.representative, 'SEM REPRESENTANTE'::text))) AS representative,
  COALESCE(o.owner_email, lcr.representative_email, c.owner_email) AS owner_email,
  COALESCE(o.order_number, 'SEM_PEDIDO'::text) AS order_number,
  COALESCE(o.quantity, 0) AS quantity,
  COALESCE(o.price, 0::numeric) AS price,
  COALESCE(o.price, 0::numeric) AS line_revenue,
  CASE
    WHEN COALESCE(o.status, ''::text) ~~* 'faturado'::text OR COALESCE(o.status, ''::text) ~~* 'entregue'::text THEN 'faturado'::text
    ELSE 'carteira'::text
  END AS revenue_status
FROM public.orders o
LEFT JOIN public.clients c ON c.id = o.client_id
LEFT JOIN latest_client_rep lcr ON lcr.client_id = o.client_id;