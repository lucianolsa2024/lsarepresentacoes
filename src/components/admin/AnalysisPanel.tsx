import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useExecutiveDashboard } from '@/hooks/useExecutiveDashboard';
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart,
} from 'recharts';

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const MES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function AnalysisPanel() {
  const { saudeCarteira, segmentacaoAbc, sellOutMensal, positivacaoMensal, loading } =
    useExecutiveDashboard();

  // Sell-out mensal (últimos 12 meses, agregado)
  const chartData = useMemo(() => {
    const monthMap = new Map<string, { mes: string; total: number }>();
    for (const row of sellOutMensal) {
      const existing = monthMap.get(row.mes);
      const val = Number(row.sell_out_total) || 0;
      if (existing) existing.total += val;
      else monthMap.set(row.mes, { mes: row.mes, total: val });
    }
    return Array.from(monthMap.values())
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12)
      .map((r) => {
        const [, m] = r.mes.split('-');
        return { label: MES_NOMES[parseInt(m, 10) - 1], total: r.total };
      });
  }, [sellOutMensal]);

  // Positivação por segmento (ABC)
  const positivacaoPorSegmento = useMemo(() => {
    const segMap: Record<string, { total: number; positivados30: number; positivados60: number; positivados90: number }> = {
      A: { total: 0, positivados30: 0, positivados60: 0, positivados90: 0 },
      B: { total: 0, positivados30: 0, positivados60: 0, positivados90: 0 },
      C: { total: 0, positivados30: 0, positivados60: 0, positivados90: 0 },
    };

    const clientSegMap = new Map<string, string>();
    for (const c of segmentacaoAbc) clientSegMap.set(c.client_name, c.segmento);

    for (const c of saudeCarteira) {
      const seg = clientSegMap.get(c.client_name) || 'C';
      if (!segMap[seg]) continue;
      segMap[seg].total++;
      const dias = c.dias_sem_sellout ?? 999;
      if (dias <= 30) segMap[seg].positivados30++;
      if (dias <= 60) segMap[seg].positivados60++;
      if (dias <= 90) segMap[seg].positivados90++;
    }

    return Object.entries(segMap).map(([seg, data]) => ({
      segmento: seg,
      total: data.total,
      taxa30: data.total > 0 ? (data.positivados30 / data.total) * 100 : 0,
      taxa60: data.total > 0 ? (data.positivados60 / data.total) * 100 : 0,
      taxa90: data.total > 0 ? (data.positivados90 / data.total) * 100 : 0,
    }));
  }, [saudeCarteira, segmentacaoAbc]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sell-out Mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sell-out Mensal (últimos 12 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [fmtBRL(value), 'Sell-out']}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sell-out" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados disponíveis</p>
          )}
        </CardContent>
      </Card>

      {/* Positivação por Segmento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Positivação por Segmento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Segmento</th>
                  <th className="text-center py-2 font-medium">Clientes</th>
                  <th className="text-center py-2 font-medium">30 dias</th>
                  <th className="text-center py-2 font-medium">60 dias</th>
                  <th className="text-center py-2 font-medium">90 dias</th>
                </tr>
              </thead>
              <tbody>
                {positivacaoPorSegmento.map((row) => (
                  <tr key={row.segmento} className="border-b last:border-0">
                    <td className="py-3">
                      <Badge variant="outline" className="font-semibold">{row.segmento}</Badge>
                    </td>
                    <td className="text-center py-3">{row.total}</td>
                    <td className="text-center py-3">
                      <span className={row.taxa30 >= 70 ? 'text-green-600' : row.taxa30 >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                        {fmtPct(row.taxa30)}
                      </span>
                    </td>
                    <td className="text-center py-3">
                      <span className={row.taxa60 >= 80 ? 'text-green-600' : row.taxa60 >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                        {fmtPct(row.taxa60)}
                      </span>
                    </td>
                    <td className="text-center py-3">
                      <span className={row.taxa90 >= 90 ? 'text-green-600' : row.taxa90 >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                        {fmtPct(row.taxa90)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {positivacaoMensal.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Evolução mensal de clientes com sell-out</p>
              <ResponsiveContainer width="100%" height={150}>
                <ComposedChart data={positivacaoMensal.slice(-6).map((r) => {
                  const [, m] = r.mes.split('-');
                  return { label: MES_NOMES[parseInt(m, 10) - 1], total: Number(r.clientes_com_sellout) || 0 };
                })}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Com sell-out" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
