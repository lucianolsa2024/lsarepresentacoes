import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SalesBaseRow {
  id: string | null;
  issue_date: string | null;
  month_ref: string | null;
  year_ref: number | null;
  month_num: number | null;
  owner_email: string | null;
  representative: string | null;
  client_id: string | null;
  client_name: string | null;
  supplier: string | null;
  order_number: string | null;
  line_revenue: number | null;
  price: number | null;
  quantity: number | null;
  revenue_status: string | null;
}

export interface SalesAnalyticsFilters {
  startDate?: string;
  endDate?: string;
}

export function useSalesAnalyticsReport(filters?: SalesAnalyticsFilters) {
  const [rows, setRows] = useState<SalesBaseRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRows = async () => {
      try {
        setLoading(true);

        let query = supabase
          .from('v_sales_base')
          .select('*')
          .order('issue_date', { ascending: false });

        if (filters?.startDate) {
          query = query.gte('issue_date', filters.startDate);
        }

        if (filters?.endDate) {
          query = query.lte('issue_date', filters.endDate);
        }

        const { data, error } = await query;

        if (error) throw error;

        setRows((data as SalesBaseRow[] | null) ?? []);
      } catch (error) {
        console.error('Erro ao carregar relatório analítico de vendas:', error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, [filters?.startDate, filters?.endDate]);

  const summary = useMemo(() => {
    const totalRevenue = rows.reduce((sum, row) => sum + Number(row.line_revenue || 0), 0);
    const totalOrders = new Set(rows.map(r => r.id).filter(Boolean)).size;
    const totalVolume = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);

    const faturadoRevenue = rows
      .filter(r => ['faturado', 'entregue'].includes((r.revenue_status || '').toLowerCase()))
      .reduce((sum, row) => sum + Number(row.line_revenue || 0), 0);

    const vendaRevenue = totalRevenue - faturadoRevenue;

    return {
      totalRevenue,
      totalOrders,
      totalVolume,
      faturadoRevenue,
      vendaRevenue,
      avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }, [rows]);

  return {
    rows,
    summary,
    loading,
  };
}
