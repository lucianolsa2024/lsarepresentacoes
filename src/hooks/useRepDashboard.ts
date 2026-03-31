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

export function useRepDashboard(): UseRepDashboardResult {
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

  useEffect(() => {
    if (!user?.email || isAdmin === null) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const email = user.email;

        // Meta, comparativo e YoY sempre filtram pelo próprio email
        let monthQuery = supabase
          .from('v_rep_month_dashboard')
          .select('*')
          .eq('owner_email', email);

        let compareQuery = supabase
          .from('v_rep_90d_compare')
          .select('*')
          .eq('owner_email', email);

        let yoyQuery = supabase
          .from('v_rep_mtd_yoy')
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

        // Para não-admin, restringe inativos e top clientes ao próprio representante
        if (!isAdmin) {
          inactiveQuery = inactiveQuery.eq('owner_email', email);
          topClientsQuery = topClientsQuery.eq('owner_email', email);
        }

        // Busca clientes corporativos para exclusão da lista de inativos
        let supplierMtdQuery = supabase
          .from('v_sales_mtd_by_supplier')
          .select('*')
          .eq('owner_email', email)
          .order('revenue_mtd', { ascending: false });

        let clientMtdQuery = supabase
          .from('v_sales_mtd_by_client')
          .select('*')
          .eq('owner_email', email)
          .order('revenue_mtd', { ascending: false })
          .limit(10);

        const corpQuery = supabase
          .from('clients')
          .select('id')
          .or([
            'segment.ilike.%Construtora%',
            'segment.ilike.%Incorporadora%',
            'segment.ilike.%Escritório de Arquitetura%',
            'segment.ilike.%corporativo%',
          ].join(','));

        const [
          monthRes,
          compareRes,
          yoyRes,
          inactiveRes,
          topClientsRes,
          supplierMtdRes,
          clientMtdRes,
          corpRes,
        ] = await Promise.all([
          monthQuery,
          compareQuery,
          yoyQuery,
          inactiveQuery,
          topClientsQuery,
          supplierMtdQuery,
          clientMtdQuery,
          corpQuery,
        ]);

        if (monthRes.error) throw monthRes.error;
        if (compareRes.error) throw compareRes.error;
        if (yoyRes.error) throw yoyRes.error;
        if (inactiveRes.error) throw inactiveRes.error;
        if (topClientsRes.error) throw topClientsRes.error;
        if (supplierMtdRes.error) throw supplierMtdRes.error;
        if (clientMtdRes.error) throw clientMtdRes.error;
        if (corpRes.error) throw corpRes.error;

        const corpIds = new Set((corpRes.data ?? []).map((c: { id: string }) => c.id));

        const filteredInactive = ((inactiveRes.data as InactiveClient[] | null) ?? [])
          .filter((client) => client.client_id && !corpIds.has(client.client_id));

        // Em caso de admin, as views podem retornar várias linhas
        // Aqui pegamos a primeira apenas para manter compatibilidade com a tela atual.
        // Se depois você quiser dashboard consolidado/admin, o ideal é criar uma tela separada.
        const monthRow = Array.isArray(monthRes.data) ? monthRes.data[0] : monthRes.data;
        const compareRow = Array.isArray(compareRes.data) ? compareRes.data[0] : compareRes.data;
        const yoyRow = Array.isArray(yoyRes.data) ? yoyRes.data[0] : yoyRes.data;

        setMonthData((monthRow as RepMonthDashboard) ?? null);
        setCompare90d((compareRow as Rep90dCompare) ?? null);
        setMtdYoy((yoyRow as RepMtdYoy) ?? null);
        setInactiveClients(filteredInactive);
        setTopClients90d((topClientsRes.data as TopClient90d[] | null) ?? []);
        setMtdBySupplier((supplierMtdRes.data as MtdBySupplier[] | null) ?? []);
        setMtdByClient((clientMtdRes.data as MtdByClient[] | null) ?? []);
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
  }, [user?.email, isAdmin]);

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
