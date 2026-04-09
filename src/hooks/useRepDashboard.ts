import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';

export interface RepMonthDashboard {
  owner_email: string | null;
  month_start: string | null;
  month_end: string | null;
  today: string | null;
  goal_value: number | null;
  sold_month: number | null;
  goal_achieved_pct: number | null;
  daily_pace_so_far: number | null;
  remaining_to_goal: number | null;
  required_daily_pace_remaining: number | null;
}

export interface Rep90dCompare {
  owner_email: string | null;
  revenue_90d: number | null;
  volume_90d: number | null;
  orders_90d: number | null;
  ticket_90d: number | null;
  revenue_prev_90d: number | null;
  volume_prev_90d: number | null;
  orders_prev_90d: number | null;
  ticket_prev_90d: number | null;
  revenue_change_pct: number | null;
  volume_change_pct: number | null;
  ticket_change_pct: number | null;
}

export interface RepMtdYoy {
  owner_email: string | null;
  revenue_mtd_current: number | null;
  revenue_mtd_previous: number | null;
  revenue_mtd_diff: number | null;
  revenue_mtd_yoy_pct: number | null;
}

export interface InactiveClient {
  owner_email: string | null;
  client_id: string | null;
  client_name: string | null;
  last_purchase_date: string | null;
  days_since_last_purchase: number | null;
  revenue_12m: number | null;
  volume_12m: number | null;
  orders_12m: number | null;
  ticket_avg_12m: number | null;
}

export interface TopClient90d {
  owner_email: string | null;
  client_id: string | null;
  client_name: string | null;
  revenue_90d: number | null;
  volume_90d: number | null;
  orders_90d: number | null;
  ticket_90d: number | null;
  rank_position?: number | null;
}

export interface MtdBySupplier {
  owner_email: string | null;
  supplier: string | null;
  revenue_mtd: number | null;
  volume_mtd: number | null;
  orders_mtd: number | null;
  ticket_mtd: number | null;
}

export interface MtdByClient {
  owner_email: string | null;
  client_id: string | null;
  client_name: string | null;
  revenue_mtd: number | null;
  volume_mtd: number | null;
  orders_mtd: number | null;
  ticket_mtd: number | null;
}

interface UseRepDashboardResult {
  monthData: RepMonthDashboard | null;
  compare90d: Rep90dCompare | null;
  mtdYoy: RepMtdYoy | null;
  inactiveClients: InactiveClient[];
  topClients90d: TopClient90d[];
  mtdBySupplier: MtdBySupplier[];
  mtdByClient: MtdByClient[];
  loading: boolean;
  isAdmin: boolean | null;
}

/** Helper: first day of month as YYYY-MM-DD */
function toMonthStart(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function isCurrentMonth(monthStart: string): boolean {
  return monthStart === toMonthStart(new Date());
}

/**
 * Builds month dashboard data from v_sales_base for any month.
 */
async function fetchMonthFromSalesBase(
  email: string,
  monthStart: string,
  isAdminUser?: boolean,
): Promise<{ sold: number; bySupplier: MtdBySupplier[]; byClient: MtdByClient[] }> {
  // Parse date parts manually to avoid timezone issues
  const [y, m] = monthStart.split('-').map(Number);
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  const monthEnd = `${nextY}-${String(nextM).padStart(2, '0')}-01`;

  let query = supabase
    .from('v_sales_base')
    .select('client_id, client_name, supplier, owner_email, line_revenue, quantity')
    .gte('issue_date', monthStart)
    .lt('issue_date', monthEnd);

  if (!isAdminUser) {
    query = query.eq('owner_email', email);
  }

  const { data, error } = await query;

  if (error) throw error;

  const rows = data ?? [];
  let sold = 0;

  const supplierMap = new Map<string, MtdBySupplier>();
  const clientMap = new Map<string, MtdByClient>();

  for (const r of rows) {
    const rev = Number(r.line_revenue) || 0;
    const qty = Number(r.quantity) || 0;
    sold += rev;

    // By supplier
    const sup = r.supplier ?? 'SEM FORNECEDOR';
    const existing = supplierMap.get(sup);
    if (existing) {
      existing.revenue_mtd = (existing.revenue_mtd ?? 0) + rev;
      existing.volume_mtd = (existing.volume_mtd ?? 0) + qty;
      existing.orders_mtd = (existing.orders_mtd ?? 0) + 1;
    } else {
      supplierMap.set(sup, {
        owner_email: email,
        supplier: sup,
        revenue_mtd: rev,
        volume_mtd: qty,
        orders_mtd: 1,
        ticket_mtd: 0,
      });
    }

    // By client
    const cid = r.client_id ?? r.client_name ?? 'unknown';
    const existingC = clientMap.get(cid);
    if (existingC) {
      existingC.revenue_mtd = (existingC.revenue_mtd ?? 0) + rev;
      existingC.volume_mtd = (existingC.volume_mtd ?? 0) + qty;
      existingC.orders_mtd = (existingC.orders_mtd ?? 0) + 1;
    } else {
      clientMap.set(cid, {
        owner_email: email,
        client_id: r.client_id,
        client_name: r.client_name,
        revenue_mtd: rev,
        volume_mtd: qty,
        orders_mtd: 1,
        ticket_mtd: 0,
      });
    }
  }

  // Calculate tickets
  const bySupplier = Array.from(supplierMap.values())
    .map((s) => ({ ...s, ticket_mtd: (s.orders_mtd ?? 0) > 0 ? (s.revenue_mtd ?? 0) / (s.orders_mtd ?? 1) : 0 }))
    .sort((a, b) => (b.revenue_mtd ?? 0) - (a.revenue_mtd ?? 0));

  const byClient = Array.from(clientMap.values())
    .map((c) => ({ ...c, ticket_mtd: (c.orders_mtd ?? 0) > 0 ? (c.revenue_mtd ?? 0) / (c.orders_mtd ?? 1) : 0 }))
    .sort((a, b) => (b.revenue_mtd ?? 0) - (a.revenue_mtd ?? 0))
    .slice(0, 10);

  return { sold, bySupplier, byClient };
}

export function useRepDashboard(selectedMonth?: string, filterEmail?: string): UseRepDashboardResult {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();

  const [monthData, setMonthData] = useState<RepMonthDashboard | null>(null);
  const [compare90d, setCompare90d] = useState<Rep90dCompare | null>(null);
  const [mtdYoy, setMtdYoy] = useState<RepMtdYoy | null>(null);
  const [inactiveClients, setInactiveClients] = useState<InactiveClient[]>([]);
  const [topClients90d, setTopClients90d] = useState<TopClient90d[]>([]);
  const [mtdBySupplier, setMtdBySupplier] = useState<MtdBySupplier[]>([]);
  const [mtdByClient, setMtdByClient] = useState<MtdByClient[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStart = selectedMonth ?? toMonthStart(new Date());
  const currentMonth = isCurrentMonth(monthStart);

  useEffect(() => {
    if (!user?.email || isAdmin === null) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // If admin selected a specific rep, use that email; otherwise use logged-in user
        const email = (isAdmin && filterEmail) ? filterEmail : user.email!;
        // showAll = admin with no specific rep filter
        const showAll = isAdmin === true && !filterEmail;

        // --- Always fetch: 90d compare, inactive, top clients, corp ids ---
        let compareQuery = supabase
          .from('v_rep_90d_compare')
          .select('*')
          .eq('owner_email', email);

        let inactiveQuery = supabase
          .from('v_rep_clients_no_purchase_60d')
          .select('*')
          .order('revenue_12m', { ascending: false });

        let topClientsQuery = supabase
          .from('v_rep_top_clients_90d')
          .select('*')
          .order('revenue_90d', { ascending: false })
          .limit(5);

        if (!showAll) {
          inactiveQuery = inactiveQuery.eq('owner_email', email);
          topClientsQuery = topClientsQuery.eq('owner_email', email);
        }

        const corpQuery = supabase
          .from('clients')
          .select('id')
          .or([
            'segment.ilike.%Construtora%',
            'segment.ilike.%Incorporadora%',
            'segment.ilike.%Escritório de Arquitetura%',
            'segment.ilike.%corporativo%',
          ].join(','));

        // --- Month-specific queries ---
        if (currentMonth && !showAll) {
          // Use optimized views for current month with specific rep
          const monthQuery = supabase
            .from('v_rep_month_dashboard')
            .select('*')
            .eq('owner_email', email);

          // YoY: compare same day range (1st to today) current year vs previous year
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const prevYearStart = `${today.getFullYear() - 1}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
          const prevYearEnd = `${today.getFullYear() - 1}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

          // Fetch current MTD and previous year same-day-range in parallel from v_sales_base
          let yoyCurrQuery = supabase
            .from('v_sales_base')
            .select('line_revenue')
            .gte('issue_date', monthStart)
            .lte('issue_date', todayStr);
          let yoyPrevQuery = supabase
            .from('v_sales_base')
            .select('line_revenue')
            .gte('issue_date', prevYearStart)
            .lte('issue_date', prevYearEnd);

          if (!showAll) {
            yoyCurrQuery = yoyCurrQuery.eq('owner_email', email);
            yoyPrevQuery = yoyPrevQuery.eq('owner_email', email);
          }

          const supplierMtdQuery = supabase
            .from('v_sales_mtd_by_supplier')
            .select('*')
            .eq('owner_email', email)
            .order('revenue_mtd', { ascending: false });

          const clientMtdQuery = supabase
            .from('v_sales_mtd_by_client')
            .select('*')
            .eq('owner_email', email)
            .order('revenue_mtd', { ascending: false })
            .limit(10);

          const [monthRes, compareRes, yoyCurrRes, yoyPrevRes, inactiveRes, topClientsRes, supplierMtdRes, clientMtdRes, corpRes] =
            await Promise.all([monthQuery, compareQuery, yoyCurrQuery, yoyPrevQuery, inactiveQuery, topClientsQuery, supplierMtdQuery, clientMtdQuery, corpQuery]);

          if (monthRes.error) throw monthRes.error;
          if (compareRes.error) throw compareRes.error;
          if (yoyCurrRes.error) throw yoyCurrRes.error;
          if (yoyPrevRes.error) throw yoyPrevRes.error;
          if (inactiveRes.error) throw inactiveRes.error;
          if (topClientsRes.error) throw topClientsRes.error;
          if (supplierMtdRes.error) throw supplierMtdRes.error;
          if (clientMtdRes.error) throw clientMtdRes.error;
          if (corpRes.error) throw corpRes.error;

          const corpIds = new Set((corpRes.data ?? []).map((c: { id: string }) => c.id));
          const filteredInactive = ((inactiveRes.data as InactiveClient[] | null) ?? [])
            .filter((client) => client.client_id && !corpIds.has(client.client_id));

          const monthRow = Array.isArray(monthRes.data) ? monthRes.data[0] : monthRes.data;
          const compareRow = Array.isArray(compareRes.data) ? compareRes.data[0] : compareRes.data;

          // Calculate YoY from raw data
          const revCurr = (yoyCurrRes.data ?? []).reduce((s, r) => s + (Number(r.line_revenue) || 0), 0);
          const revPrev = (yoyPrevRes.data ?? []).reduce((s, r) => s + (Number(r.line_revenue) || 0), 0);
          const yoyPct = revPrev > 0 ? ((revCurr - revPrev) / revPrev) * 100 : null;

          setMonthData((monthRow as RepMonthDashboard) ?? null);
          setCompare90d((compareRow as Rep90dCompare) ?? null);
          setMtdYoy({
            owner_email: email,
            revenue_mtd_current: revCurr,
            revenue_mtd_previous: revPrev,
            revenue_mtd_diff: revCurr - revPrev,
            revenue_mtd_yoy_pct: yoyPct,
          });
          setInactiveClients(filteredInactive);
          setTopClients90d((topClientsRes.data as TopClient90d[] | null) ?? []);
          setMtdBySupplier((supplierMtdRes.data as MtdBySupplier[] | null) ?? []);
          setMtdByClient((clientMtdRes.data as MtdByClient[] | null) ?? []);
        } else {
          // Historical month and/or admin all-reps: query v_sales_base directly
          const goalQuery = supabase
            .from('rep_goals')
            .select('goal_value')
            .eq('owner_email', email)
            .eq('month_start', monthStart)
            .maybeSingle();

          // Calculate previous year same month for YoY
          const [hy0, hm0] = monthStart.split('-').map(Number);
          const prevYearMonthStart = `${hy0 - 1}-${String(hm0).padStart(2, '0')}-01`;

          const [compareRes, inactiveRes, topClientsRes, corpRes, goalRes, salesData, prevYearSalesData] =
            await Promise.all([
              compareQuery,
              inactiveQuery,
              topClientsQuery,
              corpQuery,
              goalQuery,
              fetchMonthFromSalesBase(email, monthStart, showAll),
              fetchMonthFromSalesBase(email, prevYearMonthStart, showAll),
            ]);

          if (compareRes.error) throw compareRes.error;
          if (inactiveRes.error) throw inactiveRes.error;
          if (topClientsRes.error) throw topClientsRes.error;
          if (corpRes.error) throw corpRes.error;
          if (goalRes.error) throw goalRes.error;

          const corpIds = new Set((corpRes.data ?? []).map((c: { id: string }) => c.id));
          const filteredInactive = ((inactiveRes.data as InactiveClient[] | null) ?? [])
            .filter((client) => client.client_id && !corpIds.has(client.client_id));

          const goalValue = goalRes.data?.goal_value ?? 0;
          const soldMonth = salesData.sold;
          const goalAchievedPct = goalValue > 0 ? soldMonth / goalValue : null;

          // For historical months, calculate the next month end
          const [hy, hm] = monthStart.split('-').map(Number);
          const hNextM = hm === 12 ? 1 : hm + 1;
          const hNextY = hm === 12 ? hy + 1 : hy;
          const monthEnd = `${hNextY}-${String(hNextM).padStart(2, '0')}-01`;
          const lastDay = new Date(hy, hm, 0).getDate();

          setMonthData({
            owner_email: email,
            month_start: monthStart,
            month_end: monthEnd,
            today: monthEnd,
            goal_value: goalValue,
            sold_month: soldMonth,
            goal_achieved_pct: goalAchievedPct,
            daily_pace_so_far: lastDay > 0 ? soldMonth / lastDay : 0,
            remaining_to_goal: Math.max(goalValue - soldMonth, 0),
            required_daily_pace_remaining: null,
          });

          const compareRow = Array.isArray(compareRes.data) ? compareRes.data[0] : compareRes.data;
          setCompare90d((compareRow as Rep90dCompare) ?? null);

          // Current month must compare same elapsed day range in previous year
          let revCurrent = salesData.sold;
          let revPrev = prevYearSalesData.sold;

          if (currentMonth) {
            const today = new Date();
            const currentPeriodEnd = `${hy}-${String(hm).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const prevYearPeriodEnd = `${hy - 1}-${String(hm).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            let yoyCurrQuery = supabase
              .from('v_sales_base')
              .select('line_revenue')
              .gte('issue_date', monthStart)
              .lte('issue_date', currentPeriodEnd);

            let yoyPrevQuery = supabase
              .from('v_sales_base')
              .select('line_revenue')
              .gte('issue_date', prevYearMonthStart)
              .lte('issue_date', prevYearPeriodEnd);

            if (!showAll) {
              yoyCurrQuery = yoyCurrQuery.eq('owner_email', email);
              yoyPrevQuery = yoyPrevQuery.eq('owner_email', email);
            }

            const [yoyCurrRes, yoyPrevRes] = await Promise.all([yoyCurrQuery, yoyPrevQuery]);
            if (yoyCurrRes.error) throw yoyCurrRes.error;
            if (yoyPrevRes.error) throw yoyPrevRes.error;

            revCurrent = (yoyCurrRes.data ?? []).reduce((sum, row) => sum + (Number(row.line_revenue) || 0), 0);
            revPrev = (yoyPrevRes.data ?? []).reduce((sum, row) => sum + (Number(row.line_revenue) || 0), 0);
          }

          const yoyPct = revPrev > 0 ? ((revCurrent - revPrev) / revPrev) * 100 : null;
          setMtdYoy({
            owner_email: email,
            revenue_mtd_current: revCurrent,
            revenue_mtd_previous: revPrev,
            revenue_mtd_diff: revCurrent - revPrev,
            revenue_mtd_yoy_pct: yoyPct,
          });
          setInactiveClients(filteredInactive);
          setTopClients90d((topClientsRes.data as TopClient90d[] | null) ?? []);
          setMtdBySupplier(salesData.bySupplier);
          setMtdByClient(salesData.byClient);
        }
      } catch (error) {
        console.error('Erro ao carregar dashboard do representante:', error);
        setMonthData(null);
        setCompare90d(null);
        setMtdYoy(null);
        setInactiveClients([]);
        setTopClients90d([]);
        setMtdBySupplier([]);
        setMtdByClient([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.email, isAdmin, monthStart, filterEmail]);

  return {
    monthData,
    compare90d,
    mtdYoy,
    inactiveClients,
    topClients90d,
    mtdBySupplier,
    mtdByClient,
    loading,
    isAdmin,
  };
}
