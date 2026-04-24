import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { RefreshCw, TrendingUp, Users } from 'lucide-react';
import { useClientCurves } from '@/hooks/useClientCurves';
import { ClientCurve } from '@/hooks/useClients';

const CURVE_COLORS: Record<ClientCurve, string> = {
  A: '#166534',
  B: '#2563eb',
  C: '#ca8a04',
  D: '#6b7280',
};

const CURVE_LABELS: Record<ClientCurve, string> = {
  A: 'Curva A – 75% do faturamento',
  B: 'Curva B – 10% do faturamento',
  C: 'Curva C – 10% do faturamento',
  D: 'Curva D – 5% + inativos',
};

const CORPORATE_SEGMENTS = ['construtora', 'incorporadora', 'escritório de arquitetura', 'escritorio de arquitetura'];

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ClientCurveReport() {
  const [clients, setClients] = useState<any[]>([]);
  const [reps, setReps] = useState<{ name: string; email: string }[]>([]);
  const [repFilter, setRepFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const { updateAllCurves, calculating } = useClientCurves();

  // Fetch data for top-10 revenue (need orders join)
  const [orderStats, setOrderStats] = useState<Record<string, { revenue: number; orders: number }>>({});

  const fetchData = async () => {
    setLoading(true);

    const [{ data: clientsData }, { data: repsData }] = await Promise.all([
      supabase.from('clients').select('id, company, owner_email, curve, curve_updated_at, segment'),
      supabase.from('representatives_map' as any).select('representative_name, email').eq('active', true),
    ]);

    // Exclude corporate clients from the report
    const nonCorporate = (clientsData || []).filter((c: any) => {
      const seg = (c.segment || '').toLowerCase().trim();
      return !CORPORATE_SEGMENTS.includes(seg);
    });

    setClients(nonCorporate);
    setReps((repsData as any[] || []).map((r: any) => ({ name: r.representative_name, email: r.email })));

    // Find last update time
    const updated = nonCorporate
      .map((c: any) => c.curve_updated_at)
      .filter(Boolean)
      .sort()
      .pop();
    setLastUpdate(updated || null);

    // Fetch 90-day order stats for top-10 (revenue R$)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const { data: orders } = await supabase
      .from('orders')
      .select('client_id, price, quantity')
      .gte('issue_date', ninetyDaysAgo.toISOString().split('T')[0])
      .not('client_id', 'is', null);

    const stats: Record<string, { revenue: number; orders: number }> = {};
    (orders || []).forEach((o: any) => {
      if (!o.client_id) return;
      if (!stats[o.client_id]) stats[o.client_id] = { revenue: 0, orders: 0 };
      stats[o.client_id].revenue += (Number(o.price) || 0) * (Number(o.quantity) || 1);
      stats[o.client_id].orders += 1;
    });
    setOrderStats(stats);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    if (repFilter === 'all') return clients;
    return clients.filter((c: any) => c.owner_email === repFilter);
  }, [clients, repFilter]);

  const curveCounts = useMemo(() => {
    const counts: Record<ClientCurve, number> = { A: 0, B: 0, C: 0, D: 0 };
    filtered.forEach((c: any) => {
      const curve = (c.curve || 'D') as ClientCurve;
      counts[curve] = (counts[curve] || 0) + 1;
    });
    return counts;
  }, [filtered]);

  const total = filtered.length;

  const pieData = (['A', 'B', 'C', 'D'] as ClientCurve[]).map(curve => ({
    name: `Curva ${curve}`,
    value: curveCounts[curve],
    color: CURVE_COLORS[curve],
  }));

  const top10A = useMemo(() => {
    return filtered
      .filter((c: any) => c.curve === 'A')
      .map((c: any) => ({
        ...c,
        volume: orderStats[c.id]?.volume || 0,
        orders: orderStats[c.id]?.orders || 0,
      }))
      .sort((a: any, b: any) => b.volume - a.volume)
      .slice(0, 10);
  }, [filtered, orderStats]);

  const handleUpdateAll = () => {
    updateAllCurves(fetchData);
  };

  const getCurveBadge = (curve: ClientCurve) => {
    const colorMap: Record<ClientCurve, string> = {
      A: 'bg-green-800 text-white hover:bg-green-800',
      B: 'bg-blue-600 text-white hover:bg-blue-600',
      C: 'bg-yellow-500 text-white hover:bg-yellow-500',
      D: 'bg-gray-400 text-white hover:bg-gray-400',
    };
    return <Badge className={colorMap[curve]}>Curva {curve}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select value={repFilter} onValueChange={setRepFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Todos os representantes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os representantes</SelectItem>
              {reps.map(r => (
                <SelectItem key={r.email} value={r.email}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Última atualização: {new Date(lastUpdate).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
        <Button onClick={handleUpdateAll} disabled={calculating}>
          <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
          {calculating ? 'Calculando...' : 'Atualizar Curva de Todos'}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Total
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
        </Card>
        {(['A', 'B', 'C', 'D'] as ClientCurve[]).map(curve => (
          <Card key={curve}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: CURVE_COLORS[curve] }}>
                <TrendingUp className="h-4 w-4" /> Curva {curve}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{curveCounts[curve]}</div>
              <div className="text-xs text-muted-foreground">
                {total > 0 ? Math.round((curveCounts[curve] / total) * 100) : 0}%
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Donut chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuição por Curva</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top 10 Curve A */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top 10 – Curva A (por volume 12 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Volume 12M</TableHead>
                <TableHead className="text-right">Pedidos 12M</TableHead>
                <TableHead>Curva</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top10A.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    Nenhum cliente curva A encontrado
                  </TableCell>
                </TableRow>
              ) : (
                top10A.map((c: any, i: number) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell className="font-medium">{c.company}</TableCell>
                    <TableCell className="text-right">{c.volume.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right">{c.orders}</TableCell>
                    <TableCell>{getCurveBadge('A')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
