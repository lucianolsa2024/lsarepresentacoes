import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Users, Target, BarChart3, ShieldAlert } from 'lucide-react';
import { useExecutiveDashboard } from '@/hooks/useExecutiveDashboard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend,
} from 'recharts';

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const today = () =>
  new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function DashboardExecutivo() {
  const { saudeCarteira, clientesRisco, segmentacaoAbc, sellInMensal, yoyMensal, positivacaoMensal, loading } =
    useExecutiveDashboard();

  // KPI: Sell-in MTD (current month total across all suppliers)
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const sellInMtd = useMemo(() => {
    return sellInMensal
      .filter((r) => r.mes === currentMonth)
      .reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  }, [sellInMensal, currentMonth]);

  // YoY: current month this year vs same month last year
  const yoyData = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const thisYear = yoyMensal.find((r) => r.ano === curYear && r.mes_num === curMonth);
    const lastYear = yoyMensal.find((r) => r.ano === curYear - 1 && r.mes_num === curMonth);
    const curr = thisYear?.total ?? sellInMtd;
    const prev = lastYear?.total ?? 0;
    const pct = prev > 0 ? ((curr - prev) / prev) * 100 : null;
    return { curr, prev, pct };
  }, [yoyMensal, sellInMtd]);

  // Saúde da carteira
  const saudeResumo = useMemo(() => {
    const verde = saudeCarteira.filter((c) => c.status_compra === 'verde').length;
    const amarelo = saudeCarteira.filter((c) => c.status_compra === 'amarelo').length;
    const vermelho = saudeCarteira.filter((c) => c.status_compra === 'vermelho').length;
    return { verde, amarelo, vermelho, total: saudeCarteira.length };
  }, [saudeCarteira]);

  // Positivação 30d (latest month)
  const positivacao30d = useMemo(() => {
    if (positivacaoMensal.length === 0) return { pct: 0, positivados: 0, total: saudeResumo.total };
    const latest = positivacaoMensal[positivacaoMensal.length - 1];
    const total = saudeResumo.total || 1;
    return {
      pct: (latest.clientes_positivados / total) * 100,
      positivados: latest.clientes_positivados,
      total,
    };
  }, [positivacaoMensal, saudeResumo]);

  // Chart data: últimos 12 meses
  const chartData = useMemo(() => {
    const monthMap = new Map<string, { mes: string; total: number }>();
    const mesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Aggregate sell_in by month (all suppliers)
    for (const row of sellInMensal) {
      const existing = monthMap.get(row.mes);
      if (existing) {
        existing.total += Number(row.total) || 0;
      } else {
        monthMap.set(row.mes, { mes: row.mes, total: Number(row.total) || 0 });
      }
    }

    return Array.from(monthMap.values())
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12)
      .map((r) => {
        const [, m] = r.mes.split('-');
        return { label: mesNomes[parseInt(m, 10) - 1], total: r.total };
      });
  }, [sellInMensal]);

  // Positivação by segment (ABC)
  const positivacaoPorSegmento = useMemo(() => {
    const segMap: Record<string, { total: number; positivados30: number; positivados60: number; positivados90: number }> = {
      A: { total: 0, positivados30: 0, positivados60: 0, positivados90: 0 },
      B: { total: 0, positivados30: 0, positivados60: 0, positivados90: 0 },
      C: { total: 0, positivados30: 0, positivados60: 0, positivados90: 0 },
    };

    // Map client names to their ABC segment
    const clientSegMap = new Map<string, string>();
    for (const c of segmentacaoAbc) {
      clientSegMap.set(c.client_name, c.segmento);
    }

    for (const c of saudeCarteira) {
      const seg = clientSegMap.get(c.client_name) || 'C';
      if (!segMap[seg]) continue;
      segMap[seg].total++;
      if (c.compra_30d > 0) segMap[seg].positivados30++;
      if (c.compra_90d > 0) {
        segMap[seg].positivados90++;
        // Approximate 60d: if compra_30d > 0 or dias_sem_compra < 60
        if (c.compra_30d > 0 || c.dias_sem_compra < 60) segMap[seg].positivados60++;
      }
    }

    return Object.entries(segMap).map(([seg, data]) => ({
      segmento: seg,
      total: data.total,
      taxa30: data.total > 0 ? (data.positivados30 / data.total) * 100 : 0,
      taxa60: data.total > 0 ? (data.positivados60 / data.total) * 100 : 0,
      taxa90: data.total > 0 ? (data.positivados90 / data.total) * 100 : 0,
    }));
  }, [saudeCarteira, segmentacaoAbc]);

  // Alertas: clientes vermelho e atenção, ordered by segment (A first)
  const alertas = useMemo(() => {
    const clientSegMap = new Map<string, string>();
    for (const c of segmentacaoAbc) {
      clientSegMap.set(c.client_name, c.segmento);
    }
    const segOrder: Record<string, number> = { A: 0, B: 1, C: 2 };

    return clientesRisco
      .map((c) => ({
        ...c,
        segmento: clientSegMap.get(c.client_name) || 'C',
      }))
      .sort((a, b) => (segOrder[a.segmento] ?? 3) - (segOrder[b.segmento] ?? 3));
  }, [clientesRisco, segmentacaoAbc]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const positivacaoColor = positivacao30d.pct >= 70 ? 'text-green-600' : positivacao30d.pct >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{greeting()}, Luciano</h1>
        <p className="text-sm text-muted-foreground capitalize">{today()}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sell-in MTD */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Sell-in MTD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtBRL(sellInMtd)}</p>
            {yoyData.pct !== null && (
              <div className={`flex items-center gap-1 text-sm mt-1 ${yoyData.pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {yoyData.pct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {fmtPct(Math.abs(yoyData.pct))} vs ano anterior
              </div>
            )}
          </CardContent>
        </Card>

        {/* Positivação 30d */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" /> Positivação 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${positivacaoColor}`}>{fmtPct(positivacao30d.pct)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {positivacao30d.positivados} de {positivacao30d.total} clientes
            </p>
          </CardContent>
        </Card>

        {/* Clientes em Risco */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Clientes em Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{saudeResumo.vermelho + saudeResumo.amarelo}</p>
            <div className="flex items-center gap-3 text-xs mt-1">
              <span className="text-red-500">{saudeResumo.vermelho} críticos</span>
              <span className="text-yellow-500">{saudeResumo.amarelo} atenção</span>
            </div>
          </CardContent>
        </Card>

        {/* Saúde Carteira */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Saúde da Carteira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1">
                <Progress value={saudeResumo.total > 0 ? (saudeResumo.verde / saudeResumo.total) * 100 : 0} className="h-2" />
              </div>
              <span className="text-sm font-medium text-green-600">
                {saudeResumo.total > 0 ? fmtPct((saudeResumo.verde / saudeResumo.total) * 100) : '0%'}
              </span>
            </div>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{saudeResumo.verde} verdes</Badge>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{saudeResumo.amarelo} amarelos</Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{saudeResumo.vermelho} vermelhos</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sell-in Mensal Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sell-in Mensal (últimos 12 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [fmtBRL(value), 'Sell-in']}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sell-in" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados disponíveis</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Painel de Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            {alertas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta</p>
            ) : (
              <div className="space-y-2">
                {alertas.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            a.nivel_risco === 'critico'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }
                        >
                          {a.nivel_risco === 'critico' ? 'Crítico' : 'Atenção'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">{a.segmento}</Badge>
                      </div>
                      <p className="font-medium text-sm mt-1 truncate">{a.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.dias_sem_compra} dias sem compra · {fmtBRL(a.volume_historico)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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

            {/* Positivação mensal trend */}
            {positivacaoMensal.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Evolução mensal de clientes positivados</p>
                <ResponsiveContainer width="100%" height={150}>
                  <ComposedChart data={positivacaoMensal.slice(-6).map((r) => {
                    const [, m] = r.mes.split('-');
                    const mesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    return { label: mesNomes[parseInt(m, 10) - 1], total: r.clientes_positivados };
                  })}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Positivados" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
