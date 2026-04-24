import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Users, Target, BarChart3, ShieldAlert, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExecutiveDashboard } from '@/hooks/useExecutiveDashboard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart,
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

interface DashboardExecutivoProps {
  onNavigateToCarteira?: (filters?: { statusCompra?: string; segmento?: string }) => void;
  onNavigateToRoteiro?: () => void;
}

export function DashboardExecutivo({ onNavigateToCarteira, onNavigateToRoteiro }: DashboardExecutivoProps) {
  const { saudeCarteira, clientesRisco, segmentacaoAbc, sellOutMensal, sellOutMtd, sellInMtd, yoyMensal, positivacaoMensal, loading } =
    useExecutiveDashboard();

  // KPI: Sell-out MTD (sum across all reps)
  const sellOutMtdTotal = useMemo(() => {
    return sellOutMtd.reduce((sum, r) => sum + (Number(r.sell_out_mtd) || 0), 0);
  }, [sellOutMtd]);

  // KPI: Sell-in MTD
  const sellInMtdTotal = useMemo(() => {
    return sellInMtd.reduce((sum, r) => sum + (Number(r.sell_in_mtd) || 0), 0);
  }, [sellInMtd]);

  // YoY: current month this year vs same month last year (based on sell-out)
  const yoyData = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const thisYear = yoyMensal.find((r) => r.ano === curYear && r.mes_num === curMonth);
    const lastYear = yoyMensal.find((r) => r.ano === curYear - 1 && r.mes_num === curMonth);
    const curr = thisYear?.sellout_total ?? sellOutMtdTotal;
    const prev = lastYear?.sellout_total ?? 0;
    const pct = prev > 0 ? ((curr - prev) / prev) * 100 : null;
    return { curr, prev, pct };
  }, [yoyMensal, sellOutMtdTotal]);

  // Saúde da carteira (using status_sellout)
  const saudeResumo = useMemo(() => {
    const verde = saudeCarteira.filter((c) => c.status_sellout === 'verde').length;
    const amarelo = saudeCarteira.filter((c) => c.status_sellout === 'amarelo').length;
    const vermelho = saudeCarteira.filter((c) => c.status_sellout === 'vermelho').length;
    return { verde, amarelo, vermelho, total: saudeCarteira.length };
  }, [saudeCarteira]);

  // Positivação (latest month from vw_positivacao_mensal)
  const positivacao = useMemo(() => {
    if (positivacaoMensal.length === 0) return { pct: 0, positivados: 0, total: saudeResumo.total };
    const latest = positivacaoMensal[positivacaoMensal.length - 1];
    const total = saudeResumo.total || 1;
    const positivados = Number(latest.clientes_com_sellout) || 0;
    return {
      pct: (positivados / total) * 100,
      positivados,
      total,
    };
  }, [positivacaoMensal, saudeResumo]);

  // Chart data: sell-out últimos 12 meses
  const chartData = useMemo(() => {
    const monthMap = new Map<string, { mes: string; total: number }>();
    const mesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (const row of sellOutMensal) {
      const existing = monthMap.get(row.mes);
      const val = Number(row.sell_out_total) || 0;
      if (existing) {
        existing.total += val;
      } else {
        monthMap.set(row.mes, { mes: row.mes, total: val });
      }
    }

    return Array.from(monthMap.values())
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12)
      .map((r) => {
        const [, m] = r.mes.split('-');
        return { label: mesNomes[parseInt(m, 10) - 1], total: r.total };
      });
  }, [sellOutMensal]);

  // Positivação by segment (ABC) — based on saúde + segmentação
  const positivacaoPorSegmento = useMemo(() => {
    const segMap: Record<string, { total: number; positivados30: number; positivados60: number; positivados90: number }> = {
      A: { total: 0, positivados30: 0, positivados60: 0, positivados90: 0 },
      B: { total: 0, positivados30: 0, positivados60: 0, positivados90: 0 },
      C: { total: 0, positivados30: 0, positivados60: 0, positivados90: 0 },
    };

    const clientSegMap = new Map<string, string>();
    for (const c of segmentacaoAbc) {
      clientSegMap.set(c.client_name, c.segmento);
    }

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

  // Alertas: clientes em risco, ordered by segment (A first)
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

  const positivacaoColor = positivacao.pct >= 70 ? 'text-green-600' : positivacao.pct >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting()}, Luciano</h1>
          <p className="text-sm text-muted-foreground capitalize">{today()}</p>
        </div>
        <div className="flex gap-2">
          {onNavigateToRoteiro && (
            <Button variant="outline" onClick={onNavigateToRoteiro}>
              <MapPin className="h-4 w-4 mr-2" />
              Roteiro de Visitas
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sell-out MTD */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Sell-out MTD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtBRL(sellOutMtdTotal)}</p>
            {yoyData.pct !== null && (
              <div className={`flex items-center gap-1 text-sm mt-1 ${yoyData.pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {yoyData.pct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {fmtPct(Math.abs(yoyData.pct))} vs ano anterior
              </div>
            )}
          </CardContent>
        </Card>

        {/* Positivação */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" /> Positivação (Sell-out)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${positivacaoColor}`}>{fmtPct(positivacao.pct)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {positivacao.positivados} de {positivacao.total} clientes
            </p>
          </CardContent>
        </Card>

        {/* Clientes em Risco */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigateToCarteira?.({ statusCompra: 'vermelho' })}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Clientes em Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{clientesRisco.length}</p>
            <div className="flex items-center gap-3 text-xs mt-1">
              <span className="text-red-500">{clientesRisco.filter(c => c.nivel_risco === 'critico').length} críticos</span>
              <span className="text-yellow-500">{clientesRisco.filter(c => c.nivel_risco === 'risco').length} risco</span>
              <span className="text-orange-500">{clientesRisco.filter(c => c.nivel_risco === 'atencao').length} atenção</span>
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

      {/* Painel de Alertas */}
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
                            : a.nivel_risco === 'risco'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }
                      >
                        {a.nivel_risco === 'critico' ? 'Crítico' : a.nivel_risco === 'risco' ? 'Risco' : 'Atenção'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">{a.segmento}</Badge>
                    </div>
                    <p className="font-medium text-sm mt-1 truncate">{a.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.dias_sem_sellout} dias sem sell-out · {fmtBRL(a.sellout_historico)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
