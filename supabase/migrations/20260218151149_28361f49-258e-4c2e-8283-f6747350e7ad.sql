
-- =========================================================
-- VIEWS PARA TELA DE CLIENTES + HOME DO REPRESENTANTE
-- =========================================================

-- 1) RESUMO POR CLIENTE
create or replace view public.v_clients_summary as
select
  o.owner_email,
  o.client_id,
  o.client_name,
  max(o.issue_date) as last_purchase_date,
  (current_date - max(o.issue_date))::int as days_since_last_purchase,
  sum(case when o.issue_date >= current_date - interval '12 months' then coalesce(o.price, 0) else 0 end) as revenue_12m,
  sum(case when o.issue_date >= current_date - interval '12 months' then coalesce(o.quantity, 0) else 0 end) as volume_12m,
  count(distinct case when o.issue_date >= current_date - interval '12 months' then o.order_number end) as orders_12m,
  case
    when count(distinct case when o.issue_date >= current_date - interval '12 months' then o.order_number end) > 0
    then sum(case when o.issue_date >= current_date - interval '12 months' then coalesce(o.price,0) else 0 end)
         / count(distinct case when o.issue_date >= current_date - interval '12 months' then o.order_number end)
    else 0
  end as ticket_avg_12m,
  (max(o.issue_date) < current_date - interval '60 days') as no_purchase_60d
from public.orders o
group by o.owner_email, o.client_id, o.client_name;

-- 2) SÉRIE MENSAL 12 MESES POR CLIENTE
create or replace view public.v_client_monthly_12m as
select
  o.owner_email,
  o.client_id,
  o.client_name,
  date_trunc('month', o.issue_date)::date as month,
  sum(coalesce(o.price,0)) as revenue,
  sum(coalesce(o.quantity,0)) as volume,
  count(distinct o.order_number) as orders
from public.orders o
where o.issue_date >= (date_trunc('month', current_date) - interval '11 months')
group by o.owner_email, o.client_id, o.client_name, date_trunc('month', o.issue_date)::date;

-- 3) COMPARATIVO 90d vs 90d anterior POR CLIENTE
create or replace view public.v_client_90d_compare as
with base as (
  select
    o.owner_email, o.client_id, o.client_name,
    sum(case when o.issue_date >= current_date - interval '90 days' then coalesce(o.price,0) else 0 end) as revenue_90d,
    sum(case when o.issue_date >= current_date - interval '90 days' then coalesce(o.quantity,0) else 0 end) as volume_90d,
    count(distinct case when o.issue_date >= current_date - interval '90 days' then o.order_number end) as orders_90d,
    sum(case when o.issue_date >= current_date - interval '180 days' and o.issue_date < current_date - interval '90 days' then coalesce(o.price,0) else 0 end) as revenue_prev_90d,
    sum(case when o.issue_date >= current_date - interval '180 days' and o.issue_date < current_date - interval '90 days' then coalesce(o.quantity,0) else 0 end) as volume_prev_90d,
    count(distinct case when o.issue_date >= current_date - interval '180 days' and o.issue_date < current_date - interval '90 days' then o.order_number end) as orders_prev_90d
  from public.orders o
  group by o.owner_email, o.client_id, o.client_name
)
select
  owner_email, client_id, client_name,
  revenue_90d, volume_90d, orders_90d,
  case when orders_90d > 0 then revenue_90d / orders_90d else 0 end as ticket_90d,
  revenue_prev_90d, volume_prev_90d, orders_prev_90d,
  case when orders_prev_90d > 0 then revenue_prev_90d / orders_prev_90d else 0 end as ticket_prev_90d,
  case when revenue_prev_90d > 0 then (revenue_90d - revenue_prev_90d) / revenue_prev_90d else null end as revenue_change_pct,
  case when volume_prev_90d > 0 then (volume_90d - volume_prev_90d) / volume_prev_90d else null end as volume_change_pct,
  case when (case when orders_prev_90d > 0 then revenue_prev_90d / orders_prev_90d else 0 end) > 0
       then ((case when orders_90d > 0 then revenue_90d / orders_90d else 0 end) - (revenue_prev_90d / nullif(orders_prev_90d,0)))
            / (revenue_prev_90d / nullif(orders_prev_90d,0))
       else null end as ticket_change_pct
from base;

-- 4) FÁBRICAS COMPRADAS PELO CLIENTE (12m)
create or replace view public.v_client_suppliers_12m as
select
  o.owner_email, o.client_id, o.client_name, o.supplier,
  sum(coalesce(o.price,0)) as revenue_12m,
  sum(coalesce(o.quantity,0)) as volume_12m,
  count(distinct o.order_number) as orders_12m
from public.orders o
where o.issue_date >= current_date - interval '12 months'
group by o.owner_email, o.client_id, o.client_name, o.supplier;

-- =========================================================
-- HOME DO REPRESENTANTE
-- =========================================================

-- 5) TABELA DE METAS
create table if not exists public.rep_goals (
  owner_email text not null,
  month_start date not null,
  goal_value numeric not null,
  primary key (owner_email, month_start)
);

alter table public.rep_goals enable row level security;

create policy "rep_goals_select_own_or_admin"
on public.rep_goals for select to authenticated
using (
  has_role(auth.uid(), 'admin'::app_role)
  or owner_email = (auth.jwt()->>'email')
);

create policy "rep_goals_insert_admin"
on public.rep_goals for insert to authenticated
with check (has_role(auth.uid(), 'admin'::app_role));

create policy "rep_goals_update_admin"
on public.rep_goals for update to authenticated
using (has_role(auth.uid(), 'admin'::app_role));

create policy "rep_goals_delete_admin"
on public.rep_goals for delete to authenticated
using (has_role(auth.uid(), 'admin'::app_role));

-- 6) DASHBOARD MENSAL
create or replace view public.v_rep_month_dashboard as
with params as (
  select
    date_trunc('month', current_date)::date as month_start,
    (date_trunc('month', current_date) + interval '1 month')::date as month_end,
    current_date as today
),
sales as (
  select o.owner_email, sum(coalesce(o.price,0)) as sold_month
  from public.orders o, params p
  where o.issue_date >= p.month_start and o.issue_date < p.month_end
  group by o.owner_email
),
goals as (
  select g.owner_email, g.goal_value
  from public.rep_goals g, params p
  where g.month_start = p.month_start
)
select
  coalesce(g.owner_email, s.owner_email) as owner_email,
  p.month_start, p.month_end, p.today,
  coalesce(g.goal_value, 0) as goal_value,
  coalesce(s.sold_month, 0) as sold_month,
  case when coalesce(g.goal_value,0) > 0 then coalesce(s.sold_month,0) / g.goal_value else null end as goal_achieved_pct,
  case when (p.today - p.month_start + 1) > 0 then coalesce(s.sold_month,0) / (p.today - p.month_start + 1) else 0 end as daily_pace_so_far,
  greatest(coalesce(g.goal_value,0) - coalesce(s.sold_month,0), 0) as remaining_to_goal,
  case when (p.month_end - p.today) > 0
       then greatest(coalesce(g.goal_value,0) - coalesce(s.sold_month,0), 0) / (p.month_end - p.today)
       else null end as required_daily_pace_remaining
from params p
full join sales s on true
full join goals g on g.owner_email = s.owner_email;

-- 7) COMPARATIVO 90d GERAL DO REPRESENTANTE
create or replace view public.v_rep_90d_compare as
with base as (
  select
    o.owner_email,
    sum(case when o.issue_date >= current_date - interval '90 days' then coalesce(o.price,0) else 0 end) as revenue_90d,
    sum(case when o.issue_date >= current_date - interval '90 days' then coalesce(o.quantity,0) else 0 end) as volume_90d,
    count(distinct case when o.issue_date >= current_date - interval '90 days' then o.order_number end) as orders_90d,
    sum(case when o.issue_date >= current_date - interval '180 days' and o.issue_date < current_date - interval '90 days' then coalesce(o.price,0) else 0 end) as revenue_prev_90d,
    sum(case when o.issue_date >= current_date - interval '180 days' and o.issue_date < current_date - interval '90 days' then coalesce(o.quantity,0) else 0 end) as volume_prev_90d,
    count(distinct case when o.issue_date >= current_date - interval '180 days' and o.issue_date < current_date - interval '90 days' then o.order_number end) as orders_prev_90d
  from public.orders o
  group by o.owner_email
)
select
  owner_email,
  revenue_90d, volume_90d, orders_90d,
  case when orders_90d > 0 then revenue_90d / orders_90d else 0 end as ticket_90d,
  revenue_prev_90d, volume_prev_90d, orders_prev_90d,
  case when orders_prev_90d > 0 then revenue_prev_90d / orders_prev_90d else 0 end as ticket_prev_90d,
  case when revenue_prev_90d > 0 then (revenue_90d - revenue_prev_90d) / revenue_prev_90d else null end as revenue_change_pct,
  case when volume_prev_90d > 0 then (volume_90d - volume_prev_90d) / volume_prev_90d else null end as volume_change_pct,
  case when (case when orders_prev_90d > 0 then revenue_prev_90d / orders_prev_90d else 0 end) > 0
       then ((case when orders_90d > 0 then revenue_90d / orders_90d else 0 end) - (revenue_prev_90d / nullif(orders_prev_90d,0)))
            / (revenue_prev_90d / nullif(orders_prev_90d,0))
       else null end as ticket_change_pct
from base;

-- 8) CLIENTES SEM COMPRA 60 DIAS
create or replace view public.v_rep_clients_no_purchase_60d as
select
  owner_email, client_id, client_name,
  last_purchase_date, days_since_last_purchase,
  revenue_12m, volume_12m, orders_12m, ticket_avg_12m
from public.v_clients_summary
where no_purchase_60d = true;
