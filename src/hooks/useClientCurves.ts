import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ClientCurve } from './useClients';

interface CurveResult {
  clientId: string;
  curve: ClientCurve;
  revenue6m: number;
  orders6m: number;
  score: number;
}

export function useClientCurves() {
  const [updating, setUpdating] = useState(false);

  const calculateAllCurves = async (): Promise<CurveResult[]> => {
    // Get date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const startDate = sixMonthsAgo.toISOString().split('T')[0];

    // Fetch all clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id');
    if (clientsError) throw clientsError;

    // Fetch orders in last 6 months
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('client_id, price, quantity')
      .gte('issue_date', startDate)
      .not('client_id', 'is', null);
    if (ordersError) throw ordersError;

    // Aggregate per client
    const statsMap: Record<string, { revenue: number; orders: number }> = {};
    (orders || []).forEach((o: any) => {
      if (!o.client_id) return;
      if (!statsMap[o.client_id]) statsMap[o.client_id] = { revenue: 0, orders: 0 };
      statsMap[o.client_id].revenue += (o.price || 0) * (o.quantity || 1);
      statsMap[o.client_id].orders += 1;
    });

    const allClientIds = (clients || []).map((c: any) => c.id);

    // Separate active vs inactive
    const activeClients = allClientIds.filter(id => statsMap[id] && statsMap[id].orders > 0);
    const inactiveClients = allClientIds.filter(id => !statsMap[id] || statsMap[id].orders === 0);

    const results: CurveResult[] = [];

    // Inactive = curve D
    inactiveClients.forEach(id => {
      results.push({ clientId: id, curve: 'D', revenue6m: 0, orders6m: 0, score: 0 });
    });

    if (activeClients.length === 0) return results;

    // Normalize and score active clients
    const maxRevenue = Math.max(...activeClients.map(id => statsMap[id].revenue));
    const maxOrders = Math.max(...activeClients.map(id => statsMap[id].orders));

    const scored = activeClients.map(id => {
      const s = statsMap[id];
      const revNorm = maxRevenue > 0 ? s.revenue / maxRevenue : 0;
      const ordNorm = maxOrders > 0 ? s.orders / maxOrders : 0;
      const score = revNorm * 0.6 + ordNorm * 0.4;
      return { clientId: id, revenue6m: s.revenue, orders6m: s.orders, score };
    }).sort((a, b) => b.score - a.score);

    // Assign curves by quartile
    const total = scored.length;
    scored.forEach((item, idx) => {
      const percentile = (idx + 1) / total;
      let curve: ClientCurve;
      if (percentile <= 0.25) curve = 'A';
      else if (percentile <= 0.50) curve = 'B';
      else curve = 'C';
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
