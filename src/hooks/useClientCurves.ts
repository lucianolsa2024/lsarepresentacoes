import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ClientCurve } from './useClients';

interface CurveResult {
  clientId: string;
  curve: ClientCurve;
  revenue90d: number;
  orders90d: number;
}

const CORPORATE_SEGMENTS = ['construtora', 'incorporadora', 'escritório de arquitetura', 'escritorio de arquitetura'];

export function useClientCurves() {
  const [updating, setUpdating] = useState(false);

  const calculateAllCurves = async (): Promise<CurveResult[]> => {
    // Last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const startDate = ninetyDaysAgo.toISOString().split('T')[0];

    // Fetch all clients with segment
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, segment');
    if (clientsError) throw clientsError;

    // Exclude corporate clients
    const eligibleClients = (clients || []).filter((c: any) => {
      const seg = (c.segment || '').toLowerCase().trim();
      return !CORPORATE_SEGMENTS.includes(seg);
    });
    const eligibleIds = new Set(eligibleClients.map((c: any) => c.id));

    // Fetch orders in last 90 days
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('client_id, price, quantity')
      .gte('issue_date', startDate)
      .not('client_id', 'is', null);
    if (ordersError) throw ordersError;

    // Aggregate revenue (R$) per client (only eligible)
    const statsMap: Record<string, { revenue: number; orders: number }> = {};
    (orders || []).forEach((o: any) => {
      if (!o.client_id || !eligibleIds.has(o.client_id)) return;
      if (!statsMap[o.client_id]) statsMap[o.client_id] = { revenue: 0, orders: 0 };
      statsMap[o.client_id].revenue += (Number(o.price) || 0) * (Number(o.quantity) || 1);
      statsMap[o.client_id].orders += 1;
    });

    const results: CurveResult[] = [];

    // Inactive eligible clients = curve D
    eligibleClients.forEach((c: any) => {
      if (!statsMap[c.id] || statsMap[c.id].revenue <= 0) {
        results.push({ clientId: c.id, curve: 'D', revenue90d: 0, orders90d: 0 });
      }
    });

    // Active clients sorted by revenue desc
    const active = Object.entries(statsMap)
      .filter(([, s]) => s.revenue > 0)
      .map(([id, s]) => ({ clientId: id, revenue90d: s.revenue, orders90d: s.orders }))
      .sort((a, b) => b.revenue90d - a.revenue90d);

    const totalRevenue = active.reduce((sum, a) => sum + a.revenue90d, 0);

    if (totalRevenue === 0) return results;

    // Cumulative revenue distribution: A=75%, B=10%, C=10%, D=5%
    let cumulative = 0;
    active.forEach(item => {
      cumulative += item.revenue90d;
      const pct = cumulative / totalRevenue;
      let curve: ClientCurve;
      if (pct <= 0.75) curve = 'A';
      else if (pct <= 0.85) curve = 'B';
      else if (pct <= 0.95) curve = 'C';
      else curve = 'D';
      results.push({ ...item, curve });
    });

    return results;
  };

  const updateAllCurves = async (onComplete?: () => void) => {
    try {
      setUpdating(true);
      const results = await calculateAllCurves();
      const now = new Date().toISOString();

      // Batch update in groups of 50
      for (let i = 0; i < results.length; i += 50) {
        const batch = results.slice(i, i + 50);
        await Promise.all(
          batch.map(r =>
            supabase
              .from('clients')
              .update({ curve: r.curve, curve_updated_at: now } as any)
              .eq('id', r.clientId)
          )
        );
      }

      toast.success(`Curva atualizada para ${results.length} clientes`);
      onComplete?.();
    } catch (error) {
      console.error('Error updating curves:', error);
      toast.error('Erro ao atualizar curvas');
    } finally {
      setUpdating(false);
    }
  };

  return { updateAllCurves, calculating: updating, calculateAllCurves };
}
