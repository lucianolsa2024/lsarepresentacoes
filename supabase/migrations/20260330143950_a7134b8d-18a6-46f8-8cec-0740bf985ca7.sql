CREATE OR REPLACE VIEW v_clients_summary AS
SELECT 
  c.owner_email,
  o.client_id,
  o.client_name,
  max(o.issue_date) AS last_purchase_date,
  CURRENT_DATE - max(o.issue_date) AS days_since_last_purchase,
  sum(
    CASE
      WHEN o.issue_date >= (CURRENT_DATE - '1 year'::interval) THEN COALESCE(o.price, 0::numeric)
      ELSE 0::numeric
    END) AS revenue_12m,
  sum(
    CASE
      WHEN o.issue_date >= (CURRENT_DATE - '1 year'::interval) THEN COALESCE(o.quantity, 0)
      ELSE 0
    END) AS volume_12m,
  count(DISTINCT
    CASE
      WHEN o.issue_date >= (CURRENT_DATE - '1 year'::interval) THEN o.order_number
      ELSE NULL::text
    END) AS orders_12m,
  CASE
    WHEN count(DISTINCT
      CASE
        WHEN o.issue_date >= (CURRENT_DATE - '1 year'::interval) THEN o.order_number
        ELSE NULL::text
      END) > 0 THEN sum(
      CASE
        WHEN o.issue_date >= (CURRENT_DATE - '1 year'::interval) THEN COALESCE(o.price, 0::numeric)
        ELSE 0::numeric
      END) / count(DISTINCT
      CASE
        WHEN o.issue_date >= (CURRENT_DATE - '1 year'::interval) THEN o.order_number
        ELSE NULL::text
      END)::numeric
    ELSE 0::numeric
  END AS ticket_avg_12m,
  max(o.issue_date) < (CURRENT_DATE - '60 days'::interval) AS no_purchase_60d
FROM orders o
LEFT JOIN clients c ON c.id = o.client_id
GROUP BY c.owner_email, o.client_id, o.client_name