-- Analytics layer for Lovable / LSA Representações
-- Compatible with current schema (orders, clients, client_representatives, rep_goals)

-- =========================================================
-- 1) BASE PADRONIZADA
-- =========================================================
create or replace view public.v_sales_base as
with latest_client_rep as (
  select distinct on (cr.client_id)
    cr.client_id,
    cr.representative_email
  from public.client_representatives cr
  order by cr.client_id, cr.created_at desc
)
select
  o.id,
  o.issue_date,
  date_trunc('month', o.issue_date)::date as month_ref,
  extract(year from o.issue_date)::int as year_ref,
  extract(month from o.issue_date)::int as month_num,
  o.client_id,
  coalesce(c.trade_name, c.company, o.client_name) as client_name,
  upper(trim(coalesce(o.supplier, 'SEM FORNECEDOR'))) as supplier,
  upper(trim(coalesce(o.representative, 'SEM REPRESENTANTE'))) as representative,
  coalesce(o.owner_email, lcr.representative_email, c.owner_email) as owner_email,
  coalesce(o.order_number, 'SEM_PEDIDO') as order_number,
  coalesce(o.quantity, 0) as quantity,
  coalesce(o.price, 0::numeric) as price,
  coalesce(o.price, 0::numeric) * coalesce(o.quantity, 0)::numeric as line_revenue,
  case
    when coalesce(o.status, '') ilike 'faturado' or coalesce(o.status, '') ilike 'entregue' then 'faturado'
    else 'carteira'
  end as revenue_status
from public.orders o
left join public.clients c on c.id = o.client_id
left join latest_client_rep lcr on lcr.client_id = o.client_id;

alter view public.v_sales_base set (security_invoker = true);

-- =========================================================
-- 2) RESUMOS DE CLIENTE (substitui e amplia o atual)
-- =========================================================
create or replace view public.v_clients_summary as
with latest_client_rep as (
  select distinct on (cr.client_id)
    cr.client_id,
    cr.representative_email
  from public.client_representatives cr
  order by cr.client_id, cr.created_at desc
)
select
  coalesce(lcr.representative_email, c.owner_email, sb.owner_email) as owner_email,
  sb.client_id,
  coalesce(c.trade_name, c.company, sb.client_name) as client_name,
  max(sb.issue_date) as last_purchase_date,
  (current_date - max(sb.issue_date))::int as days_since_last_purchase,
  sum(case when sb.issue_date >= current_date - interval '12 months' then sb.line_revenue else 0 end) as revenue_12m,
  sum(case when sb.issue_date >= current_date - interval '12 months' then sb.quantity else 0 end) as volume_12m,
  count(distinct case when sb.issue_date >= current_date - interval '12 months' then sb.order_number end) as orders_12m,
  case
    when count(distinct case when sb.issue_date >= current_date - interval '12 months' then sb.order_number end) > 0
      then sum(case when sb.issue_date >= current_date - interval '12 months' then sb.line_revenue else 0 end)
           / count(distinct case when sb.issue_date >= current_date - interval '12 months' then sb.order_number end)
    else 0
  end as ticket_avg_12m,
  (max(sb.issue_date) < current_date - interval '60 days') as no_purchase_60d
from public.v_sales_base sb
left join public.clients c on c.id = sb.client_id
left join latest_client_rep lcr on lcr.client_id = sb.client_id
group by coalesce(lcr.representative_email, c.owner_email, sb.owner_email), sb.client_id, coalesce(c.trade_name, c.company, sb.client_name);

alter view public.v_clients_summary set (security_invoker = true);

create or replace view public.v_rep_clients_no_purchase_60d as
select
  owner_email,
  client_id,
  client_name,
  last_purchase_date,
  days_since_last_purchase,
  revenue_12m,
  volume_12m,
  orders_12m,
  ticket_avg_12m
from public.v_clients_summary
where no_purchase_60d = true;

alter view public.v_rep_clients_no_purchase_60d set (security_invoker = true);

-- =========================================================
-- 3) MTD + YOY MTD
-- =========================================================
create or replace view public.v_rep_mtd_yoy as
with current_period as (
  select
    owner_email,
    sum(line_revenue) as revenue_mtd_current,
    sum(quantity) as volume_mtd_current,
    count(distinct order_number) as orders_mtd_current
  from public.v_sales_base
  where issue_date >= date_trunc('month', current_date)::date
    and issue_date <= current_date
  group by owner_email
),
previous_period as (
  select
    owner_email,
    sum(line_revenue) as revenue_mtd_previous,
    sum(quantity) as volume_mtd_previous,
    count(distinct order_number) as orders_mtd_previous
  from public.v_sales_base
  where issue_date >= (date_trunc('month', current_date) - interval '1 year')::date
    and issue_date <= (current_date - interval '1 year')::date
  group by owner_email
)
select
  coalesce(c.owner_email, p.owner_email) as owner_email,
  coalesce(c.revenue_mtd_current, 0) as revenue_mtd_current,
  coalesce(p.revenue_mtd_previous, 0) as revenue_mtd_previous,
  coalesce(c.volume_mtd_current, 0) as volume_mtd_current,
  coalesce(p.volume_mtd_previous, 0) as volume_mtd_previous,
  coalesce(c.orders_mtd_current, 0) as orders_mtd_current,
  coalesce(p.orders_mtd_previous, 0) as orders_mtd_previous,
  case when coalesce(c.orders_mtd_current, 0) > 0 then coalesce(c.revenue_mtd_current, 0) / c.orders_mtd_current else 0 end as ticket_mtd_current,
  case when coalesce(p.orders_mtd_previous, 0) > 0 then coalesce(p.revenue_mtd_previous, 0) / p.orders_mtd_previous else 0 end as ticket_mtd_previous,
  coalesce(c.revenue_mtd_current, 0) - coalesce(p.revenue_mtd_previous, 0) as revenue_mtd_diff,
  case when coalesce(p.revenue_mtd_previous, 0) > 0 then (coalesce(c.revenue_mtd_current, 0) - p.revenue_mtd_previous) / p.revenue_mtd_previous else null end as revenue_mtd_yoy_pct,
  case when coalesce(p.volume_mtd_previous, 0) > 0 then (coalesce(c.volume_mtd_current, 0) - p.volume_mtd_previous) / p.volume_mtd_previous else null end as volume_mtd_yoy_pct,
  case when coalesce(p.orders_mtd_previous, 0) > 0 then (coalesce(c.orders_mtd_current, 0) - p.orders_mtd_previous)::numeric / p.orders_mtd_previous else null end as orders_mtd_yoy_pct,
  case when coalesce(
    case when p.orders_mtd_previous > 0 then p.revenue_mtd_previous / p.orders_mtd_previous else 0 end, 0) > 0
    then (
      (case when coalesce(c.orders_mtd_current,0) > 0 then coalesce(c.revenue_mtd_current,0) / c.orders_mtd_current else 0 end)
      -
      (case when coalesce(p.orders_mtd_previous,0) > 0 then coalesce(p.revenue_mtd_previous,0) / p.orders_mtd_previous else 0 end)
    )
    /
    (case when coalesce(p.orders_mtd_previous,0) > 0 then coalesce(p.revenue_mtd_previous,0) / p.orders_mtd_previous else 0 end)
  else null end as ticket_mtd_yoy_pct
from current_period c
full outer join previous_period p on p.owner_email = c.owner_email;

alter view public.v_rep_mtd_yoy set (security_invoker = true);

create or replace view public.v_client_mtd_yoy as
with current_period as (
  select
    owner_email,
    client_id,
    client_name,
    sum(line_revenue) as revenue_mtd_current,
    sum(quantity) as volume_mtd_current,
    count(distinct order_number) as orders_mtd_current
  from public.v_sales_base
  where issue_date >= date_trunc('month', current_date)::date
    and issue_date <= current_date
  group by owner_email, client_id, client_name
),
previous_period as (
  select
    owner_email,
    client_id,
    client_name,
    sum(line_revenue) as revenue_mtd_previous,
    sum(quantity) as volume_mtd_previous,
    count(distinct order_number) as orders_mtd_previous
  from public.v_sales_base
  where issue_date >= (date_trunc('month', current_date) - interval '1 year')::date
    and issue_date <= (current_date - interval '1 year')::date
  group by owner_email, client_id, client_name
)
select
  coalesce(c.owner_email, p.owner_email) as owner_email,
  coalesce(c.client_id, p.client_id) as client_id,
  coalesce(c.client_name, p.client_name) as client_name,
  coalesce(c.revenue_mtd_current, 0) as revenue_mtd_current,
  coalesce(p.revenue_mtd_previous, 0) as revenue_mtd_previous,
  coalesce(c.volume_mtd_current, 0) as volume_mtd_current,
  coalesce(p.volume_mtd_previous, 0) as volume_mtd_previous,
  coalesce(c.orders_mtd_current, 0) as orders_mtd_current,
  coalesce(p.orders_mtd_previous, 0) as orders_mtd_previous,
  case when coalesce(c.orders_mtd_current, 0) > 0 then coalesce(c.revenue_mtd_current, 0) / c.orders_mtd_current else 0 end as ticket_mtd_current,
  case when coalesce(p.orders_mtd_previous, 0) > 0 then coalesce(p.revenue_mtd_previous, 0) / p.orders_mtd_previous else 0 end as ticket_mtd_previous,
  case when coalesce(p.revenue_mtd_previous, 0) > 0 then (coalesce(c.revenue_mtd_current, 0) - p.revenue_mtd_previous) / p.revenue_mtd_previous else null end as revenue_mtd_yoy_pct,
  case when coalesce(p.volume_mtd_previous, 0) > 0 then (coalesce(c.volume_mtd_current, 0) - p.volume_mtd_previous) / p.volume_mtd_previous else null end as volume_mtd_yoy_pct,
  case when coalesce(p.orders_mtd_previous, 0) > 0 then (coalesce(c.orders_mtd_current, 0) - p.orders_mtd_previous)::numeric / p.orders_mtd_previous else null end as orders_mtd_yoy_pct
from current_period c
full outer join previous_period p
  on p.client_id is not distinct from c.client_id
 and p.owner_email is not distinct from c.owner_email;

alter view public.v_client_mtd_yoy set (security_invoker = true);

-- =========================================================
-- 4) 90d vs 90d anterior
-- =========================================================
create or replace view public.v_rep_90d_compare as
with base as (
  select
    owner_email,
    sum(case when issue_date >= current_date - interval '89 days' then line_revenue else 0 end) as revenue_90d,
    sum(case when issue_date >= current_date - interval '89 days' then quantity else 0 end) as volume_90d,
    count(distinct case when issue_date >= current_date - interval '89 days' then order_number end) as orders_90d,
    sum(case when issue_date >= current_date - interval '179 days' and issue_date < current_date - interval '89 days' then line_revenue else 0 end) as revenue_prev_90d,
    sum(case when issue_date >= current_date - interval '179 days' and issue_date < current_date - interval '89 days' then quantity else 0 end) as volume_prev_90d,
    count(distinct case when issue_date >= current_date - interval '179 days' and issue_date < current_date - interval '89 days' then order_number end) as orders_prev_90d
  from public.v_sales_base
  group by owner_email
)
select
  owner_email,
  revenue_90d,
  volume_90d,
  orders_90d,
  case when orders_90d > 0 then revenue_90d / orders_90d else 0 end as ticket_90d,
  revenue_prev_90d,
  volume_prev_90d,
  orders_prev_90d,
  case when orders_prev_90d > 0 then revenue_prev_90d / orders_prev_90d else 0 end as ticket_prev_90d,
  case when revenue_prev_90d > 0 then (revenue_90d - revenue_prev_90d) / revenue_prev_90d else null end as revenue_change_pct,
  case when volume_prev_90d > 0 then (volume_90d - volume_prev_90d) / volume_prev_90d else null end as volume_change_pct,
  case when (case when orders_prev_90d > 0 then revenue_prev_90d / orders_prev_90d else 0 end) > 0
    then ((case when orders_90d > 0 then revenue_90d / orders_90d else 0 end) - (revenue_prev_90d / nullif(orders_prev_90d,0))) / (revenue_prev_90d / nullif(orders_prev_90d,0))
    else null end as ticket_change_pct
from base;

alter view public.v_rep_90d_compare set (security_invoker = true);

create or replace view public.v_client_90d_compare as
with base as (
  select
    owner_email,
    client_id,
    client_name,
    sum(case when issue_date >= current_date - interval '89 days' then line_revenue else 0 end) as revenue_90d,
    sum(case when issue_date >= current_date - interval '89 days' then quantity else 0 end) as volume_90d,
    count(distinct case when issue_date >= current_date - interval '89 days' then order_number end) as orders_90d,
    sum(case when issue_date >= current_date - interval '179 days' and issue_date < current_date - interval '89 days' then line_revenue else 0 end) as revenue_prev_90d,
    sum(case when issue_date >= current_date - interval '179 days' and issue_date < current_date - interval '89 days' then quantity else 0 end) as volume_prev_90d,
    count(distinct case when issue_date >= current_date - interval '179 days' and issue_date < current_date - interval '89 days' then order_number end) as orders_prev_90d
  from public.v_sales_base
  group by owner_email, client_id, client_name
)
select
  owner_email,
  client_id,
  client_name,
  revenue_90d,
  volume_90d,
  orders_90d,
  case when orders_90d > 0 then revenue_90d / orders_90d else 0 end as ticket_90d,
  revenue_prev_90d,
  volume_prev_90d,
  orders_prev_90d,
  case when orders_prev_90d > 0 then revenue_prev_90d / orders_prev_90d else 0 end as ticket_prev_90d,
  case when revenue_prev_90d > 0 then (revenue_90d - revenue_prev_90d) / revenue_prev_90d else null end as revenue_change_pct,
  case when volume_prev_90d > 0 then (volume_90d - volume_prev_90d) / volume_prev_90d else null end as volume_change_pct,
  case when (case when orders_prev_90d > 0 then revenue_prev_90d / orders_prev_90d else 0 end) > 0
    then ((case when orders_90d > 0 then revenue_90d / orders_90d else 0 end) - (revenue_prev_90d / nullif(orders_prev_90d,0))) / (revenue_prev_90d / nullif(orders_prev_90d,0))
    else null end as ticket_change_pct
from base;

alter view public.v_client_90d_compare set (security_invoker = true);

-- =========================================================
-- 5) SHARE DA REPRESENTADA DENTRO DO CLIENTE (12m)
-- =========================================================
create or replace view public.v_client_supplier_share_12m as
with base as (
  select
    owner_email,
    client_id,
    client_name,
    supplier,
    sum(line_revenue) as revenue_12m,
    sum(quantity) as volume_12m,
    count(distinct order_number) as orders_12m
  from public.v_sales_base
  where issue_date >= current_date - interval '12 months'
  group by owner_email, client_id, client_name, supplier
),
client_total as (
  select
    owner_email,
    client_id,
    sum(revenue_12m) as total_client_revenue_12m,
    sum(volume_12m) as total_client_volume_12m,
    sum(orders_12m) as total_client_orders_12m
  from base
  group by owner_email, client_id
)
select
  b.owner_email,
  b.client_id,
  b.client_name,
  b.supplier,
  b.revenue_12m,
  b.volume_12m,
  b.orders_12m,
  ct.total_client_revenue_12m,
  ct.total_client_volume_12m,
  ct.total_client_orders_12m,
  case when ct.total_client_revenue_12m > 0 then b.revenue_12m / ct.total_client_revenue_12m else null end as revenue_share_pct,
  case when ct.total_client_volume_12m > 0 then b.volume_12m::numeric / ct.total_client_volume_12m else null end as volume_share_pct,
  case when ct.total_client_orders_12m > 0 then b.orders_12m::numeric / ct.total_client_orders_12m else null end as orders_share_pct
from base b
join client_total ct
  on ct.owner_email is not distinct from b.owner_email
 and ct.client_id = b.client_id;

alter view public.v_client_supplier_share_12m set (security_invoker = true);

-- =========================================================
-- 6) RANKINGS / COMPARATIVOS POR DIMENSÃO
-- =========================================================
create or replace view public.v_sales_mtd_by_representative as
select
  owner_email,
  representative,
  sum(line_revenue) as revenue_mtd,
  sum(quantity) as volume_mtd,
  count(distinct order_number) as orders_mtd,
  case when count(distinct order_number) > 0 then sum(line_revenue) / count(distinct order_number) else 0 end as ticket_mtd
from public.v_sales_base
where issue_date >= date_trunc('month', current_date)::date
  and issue_date <= current_date
group by owner_email, representative;

alter view public.v_sales_mtd_by_representative set (security_invoker = true);

create or replace view public.v_sales_mtd_by_client as
select
  owner_email,
  client_id,
  client_name,
  sum(line_revenue) as revenue_mtd,
  sum(quantity) as volume_mtd,
  count(distinct order_number) as orders_mtd,
  case when count(distinct order_number) > 0 then sum(line_revenue) / count(distinct order_number) else 0 end as ticket_mtd
from public.v_sales_base
where issue_date >= date_trunc('month', current_date)::date
  and issue_date <= current_date
group by owner_email, client_id, client_name;

alter view public.v_sales_mtd_by_client set (security_invoker = true);

create or replace view public.v_sales_mtd_by_supplier as
select
  owner_email,
  supplier,
  sum(line_revenue) as revenue_mtd,
  sum(quantity) as volume_mtd,
  count(distinct order_number) as orders_mtd,
  case when count(distinct order_number) > 0 then sum(line_revenue) / count(distinct order_number) else 0 end as ticket_mtd
from public.v_sales_base
where issue_date >= date_trunc('month', current_date)::date
  and issue_date <= current_date
group by owner_email, supplier;

alter view public.v_sales_mtd_by_supplier set (security_invoker = true);

create or replace view public.v_sales_90d_by_client as
select
  owner_email,
  client_id,
  client_name,
  sum(line_revenue) as revenue_90d,
  sum(quantity) as volume_90d,
  count(distinct order_number) as orders_90d,
  case when count(distinct order_number) > 0 then sum(line_revenue) / count(distinct order_number) else 0 end as ticket_90d
from public.v_sales_base
where issue_date >= current_date - interval '89 days'
group by owner_email, client_id, client_name;

alter view public.v_sales_90d_by_client set (security_invoker = true);

-- =========================================================
-- 7) TOP CLIENTES DO REPRESENTANTE (home)
-- =========================================================
create or replace view public.v_rep_top_clients_90d as
select
  owner_email,
  client_id,
  client_name,
  sum(line_revenue) as revenue_90d,
  sum(quantity) as volume_90d,
  count(distinct order_number) as orders_90d,
  case when count(distinct order_number) > 0 then sum(line_revenue) / count(distinct order_number) else 0 end as ticket_90d,
  row_number() over (partition by owner_email order by sum(line_revenue) desc, client_name asc) as rank_90d
from public.v_sales_base
where issue_date >= current_date - interval '89 days'
group by owner_email, client_id, client_name;

alter view public.v_rep_top_clients_90d set (security_invoker = true);

-- =========================================================
-- 8) DASHBOARD MENSAL (mantém view e acrescenta base consistente)
-- =========================================================
create or replace view public.v_rep_month_dashboard as
with params as (
  select
    date_trunc('month', current_date)::date as month_start,
    (date_trunc('month', current_date) + interval '1 month')::date as month_end,
    current_date as today
),
sales as (
  select sb.owner_email, sum(sb.line_revenue) as sold_month
  from public.v_sales_base sb, params p
  where sb.issue_date >= p.month_start and sb.issue_date < p.month_end
  group by sb.owner_email
),
goals as (
  select g.owner_email, g.goal_value
  from public.rep_goals g, params p
  where g.month_start = p.month_start
)
select
  coalesce(g.owner_email, s.owner_email) as owner_email,
  p.month_start,
  p.month_end,
  p.today,
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

alter view public.v_rep_month_dashboard set (security_invoker = true);