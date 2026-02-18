
-- Fix views to use security invoker (respects caller's RLS)
alter view public.v_clients_summary set (security_invoker = true);
alter view public.v_client_monthly_12m set (security_invoker = true);
alter view public.v_client_90d_compare set (security_invoker = true);
alter view public.v_client_suppliers_12m set (security_invoker = true);
alter view public.v_rep_month_dashboard set (security_invoker = true);
alter view public.v_rep_90d_compare set (security_invoker = true);
alter view public.v_rep_clients_no_purchase_60d set (security_invoker = true);
