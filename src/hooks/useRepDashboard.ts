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

export function useRepDashboard() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const [monthData, setMonthData] = useState<RepMonthDashboard | null>(null);
  const [compare90d, setCompare90d] = useState<Rep90dCompare | null>(null);
  const [inactiveClients, setInactiveClients] = useState<InactiveClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email || isAdmin === null) return;

    const fetchData = async () => {
      setLoading(true);
      const email = user.email!;

      const monthQuery = supabase
        .from('v_rep_month_dashboard')
        .select('*')
        .eq('owner_email', email)
        .maybeSingle();

      const compareQuery = supabase
        .from('v_rep_90d_compare')
        .select('*')
        .eq('owner_email', email)
        .maybeSingle();

      let inactiveQuery = supabase
        .from('v_rep_clients_no_purchase_60d')
        .select('*')
        .order('revenue_12m', { ascending: false });

      // Non-admin: filter by own email only
      if (!isAdmin) {
        inactiveQuery = inactiveQuery.eq('owner_email', email);
      }

      // Fetch corporativo client IDs to exclude
      const corpQuery = supabase
        .from('clients')
        .select('id')
        .ilike('segment', 'corporativo');

      const [monthRes, compareRes, inactiveRes, corpRes] = await Promise.all([
        monthQuery,
        compareQuery,
        inactiveQuery,
        corpQuery,
      ]);

      const corpIds = new Set((corpRes.data ?? []).map((c: any) => c.id));
      const filtered = ((inactiveRes.data as InactiveClient[] | null) ?? [])
        .filter(c => !corpIds.has(c.client_id));

      setMonthData(monthRes.data as RepMonthDashboard | null);
      setCompare90d(compareRes.data as Rep90dCompare | null);
      setInactiveClients(filtered);
      setLoading(false);
    };

    fetchData();
  }, [user?.email, isAdmin]);

  return { monthData, compare90d, inactiveClients, loading, isAdmin };
}
