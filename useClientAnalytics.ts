import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClientMtdYoyRow {
  client_id: string | null;
  client_name: string | null;
  revenue_mtd_current: number | null;
  revenue_mtd_previous: number | null;
  yoy_diff: number | null;
  yoy_pct: number | null;
}

export interface Client90dCompareRow {
  client_id: string | null;
  client_name: string | null;
  revenue_current_90d: number | null;
  revenue_previous_90d: number | null;
  diff_90d: number | null;
  pct_90d: number | null;
}

export interface ClientSupplierShareRow {
  client_id: string | null;
  client_name: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  revenue_12m: number | null;
  total_client_12m: number | null;
  share_pct: number | null;
}

export function useClientAnalytics(clientId?: string) {
  const [mtdYoy, setMtdYoy] = useState<ClientMtdYoyRow | null>(null);
  const [compare90d, setCompare90d] = useState<Client90dCompareRow | null>(null);
  const [supplierShare, setSupplierShare] = useState<ClientSupplierShareRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const [mtdRes, compareRes, shareRes] = await Promise.all([
          supabase
            .from('v_client_mtd_yoy')
            .select('*')
            .eq('client_id', clientId)
            .maybeSingle(),

          supabase
            .from('v_client_90d_compare')
            .select('*')
            .eq('client_id', clientId)
            .maybeSingle(),

          supabase
            .from('v_client_supplier_share_12m')
            .select('*')
            .eq('client_id', clientId)
            .order('revenue_12m', { ascending: false }),
        ]);

        if (mtdRes.error) throw mtdRes.error;
        if (compareRes.error) throw compareRes.error;
        if (shareRes.error) throw shareRes.error;

        setMtdYoy((mtdRes.data as ClientMtdYoyRow) ?? null);
        setCompare90d((compareRes.data as Client90dCompareRow) ?? null);
        setSupplierShare((shareRes.data as ClientSupplierShareRow[] | null) ?? []);
      } catch (error) {
        console.error('Erro ao carregar analytics do cliente:', error);
        setMtdYoy(null);
        setCompare90d(null);
        setSupplierShare([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  return {
    mtdYoy,
    compare90d,
    supplierShare,
    loading,
  };
}
