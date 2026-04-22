import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Target,
  Building2,
  Calendar,
  Wallet,
  Percent,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Settings as SettingsIcon,
  Loader2,
  PiggyBank,
  Gauge,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fmtBRL, fmtPct } from '@/hooks/useFinanceReports';
import {
  useExecutiveAnalytics,
  type ExecutiveTargets,
  type ExecKpi,
  type StrategicAlert,
} from '@/hooks/useExecutiveAnalytics';

interface AiResult {
  summary: string;
  highlights: string[];
  recommendations: string[];
  insights: string[];
}

const ALERT_STYLES: Record<StrategicAlert['level'], { wrap: string; icon: typeof AlertTriangle }> = {
  info: { wrap: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100', icon: AlertCircle },
  warning: { wrap: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100', icon: AlertTriangle },
  danger: { wrap: 'border-destructive/30 bg-destructive/10 text-destructive', icon: AlertTriangle },
  success: { wrap: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100', icon: CheckCircle2 },
};

function KpiCard({
  label,
  icon: Icon,
  kpi,
  format,
  invertDelta = false,
  accent = 'primary',
}: {
  label: string;
  icon: typeof Wallet;
  kpi: ExecKpi;
  format: (n: number) => string;
  invertDelta?: boolean;
  accent?: 'primary' | 'success' | 'warning' | 'destructive';
}) {
  const positive = invertDelta ? kpi.deltaPct < 0 : kpi.deltaPct > 0;
  const neutral = kpi.deltaPct === 0;
  const accentMap: Record<typeof accent, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    destructive: 'bg-destructive/10 text-destructive',
  };
  const targetReached = kpi.targetPct !== undefined && (invertDelta ? kpi.targetPct <= 1 : kpi.targetPct >= 1);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', accentMap[accent])}>
            <Icon className="h-5 w-5" />
          </div>
          {!neutral && (
            <Badge
              variant="outline"
              className={cn(
                'gap-1 border-0 text-xs font-semibold',
                positive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(kpi.deltaPct * 100).toFixed(1)}%
            </Badge>
          )}
        </div>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground transition-all">
          {format(kpi.current)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Mês anterior: <span className="font-medium">{format(kpi.previous)}</span>
        </p>
        {kpi.target !== undefined && kpi.targetPct !== undefined && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Meta {format(kpi.target)}</span>
              <span className={cn('font-semibold', targetReached ? 'text-emerald-600' : 'text-muted-foreground')}>
                {Math.min(999, Math.max(0, kpi.targetPct * 100)).toFixed(0)}%
              </span>
            </div>
            <Progress
              value={Math.min(100, Math.max(0, kpi.targetPct * 100))}
              className={cn('h-1.5', targetReached && '[&>div]:bg-emerald-500')}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TargetsDialog({
  targets,
  onSave,
}: {
  targets: ExecutiveTargets;
  onSave: (t: ExecutiveTargets) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(targets);
  useEffect(() => {
    if (open) setDraft(targets);
  }, [open, targets]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Target className="h-4 w-4" />
          Configurar metas
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Metas executivas
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Faturamento mensal (R$)</Label>
            <Input
              type="number"
              value={draft.monthly_revenue}
              onChange={(e) => setDraft({ ...draft, monthly_revenue: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Margem líquida alvo (%)</Label>
            <Input
              type="number"
              value={draft.monthly_margin_pct}
              onChange={(e) => setDraft({ ...draft, monthly_margin_pct: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Giro de caixa mensal (R$)</Label>
            <Input
              type="number"
              value={draft.monthly_cashflow}
              onChange={(e) => setDraft({ ...draft, monthly_cashflow: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Inadimplência máxima (%)</Label>
            <Input
              type="number"
              value={draft.monthly_inadimplencia_pct}
              onChange={(e) => setDraft({ ...draft, monthly_inadimplencia_pct: Number(e.target.value) })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              onSave(draft);
              setOpen(false);
              toast.success('Metas atualizadas');
            }}
          >
            Salvar metas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExecutiveDashboard() {
  const { loading, analytics, targets, updateTargets, reload } = useExecutiveAnalytics();
  const [aiLoading, setAiLoading] = useState(false);
  const [ai, setAi] = useState<AiResult | null>(null);

  const generateAi = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('finance-executive-summary', {
        body: analytics,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAi(data as AiResult);
      toast.success('Relatório executivo gerado');
    } catch (e) {
      toast.error('Falha ao gerar relatório', { description: (e as Error).message });
    } finally {
      setAiLoading(false);
    }
  };

  // Dados normalizados para gráficos
  const companyChart = useMemo(() => {
    if (!analytics.companyResults.length) return [];
    return analytics.companyResults[0].monthly.map((m, idx) => {
      const row: Record<string, any> = { label: m.label };
      for (const c of analytics.companyResults) {
        row[c.companyName] = c.monthly[idx]?.resultado ?? 0;
      }
      return row;
    });
  }, [analytics.companyResults]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando analytics…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dashboard Executivo</h2>
          <p className="text-sm text-muted-foreground">
            Período de referência: <span className="font-medium text-foreground">{analytics.context.monthLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TargetsDialog targets={targets} onSave={updateTargets} />
          <Button variant="outline" size="sm" className="gap-2" onClick={reload}>
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
          <Button size="sm" className="gap-2" onClick={generateAi} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar relatório IA
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Faturamento mensal"
          icon={Wallet}
          kpi={analytics.kpis.faturamento}
          format={fmtBRL}
          accent="primary"
        />
        <KpiCard
          label="Margem líquida"
          icon={Percent}
          kpi={analytics.kpis.margem}
          format={(n) => fmtPct(n)}
          accent="success"
        />
        <KpiCard
          label="Giro de caixa"
          icon={PiggyBank}
          kpi={analytics.kpis.giroCaixa}
          format={fmtBRL}
          accent="primary"
        />
        <KpiCard
          label="Inadimplência"
          icon={Gauge}
          kpi={analytics.kpis.inadimplencia}
          format={(n) => fmtPct(n)}
          invertDelta
          accent="warning"
        />
      </div>

      {/* Alertas estratégicos */}
      {analytics.alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertas estratégicos
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {analytics.alerts.map((a) => {
              const style = ALERT_STYLES[a.level];
              const Icon = style.icon;
              return (
                <div
                  key={a.id}
                  className={cn(
                    'flex items-start gap-2 rounded-lg border p-3 text-sm transition-all',
                    style.wrap,
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-xs opacity-80">{a.description}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Insights inteligentes (rule-based) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              Melhor dia para recebimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize text-foreground">
              {analytics.bestReceivableDay?.dayLabel ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {analytics.bestReceivableDay
                ? `${fmtBRL(analytics.bestReceivableDay.total)} acumulados em ${analytics.bestReceivableDay.count} pagamentos`
                : 'Sem dados de recebimento'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-destructive" />
              Maior volume de pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize text-foreground">
              {analytics.worstPaymentDay?.dayLabel ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {analytics.worstPaymentDay
                ? `${fmtBRL(analytics.worstPaymentDay.total)} em ${analytics.worstPaymentDay.count} saídas`
                : 'Sem dados de pagamento'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              Year-over-year (receita)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn(
              'text-2xl font-bold tabular-nums',
              analytics.yoy.deltaReceitas >= 0 ? 'text-emerald-600' : 'text-destructive',
            )}>
              {analytics.yoy.deltaReceitas >= 0 ? '+' : ''}
              {(analytics.yoy.deltaReceitas * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {fmtBRL(analytics.yoy.receitasAtual)} vs {fmtBRL(analytics.yoy.receitasAnoAnterior)} (mesmo mês ano passado)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos: resultado por empresa + sazonalidade */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Resultado por empresa (12 meses)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {companyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={companyChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number) => fmtBRL(v)}
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {analytics.companyResults.map((c, idx) => (
                    <Line
                      key={c.companyId}
                      type="monotone"
                      dataKey={c.companyName}
                      stroke={['hsl(var(--primary))', '#10b981', '#f59e0b', '#a855f7', '#ef4444'][idx % 5]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados de empresas
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              Sazonalidade ({new Date().getFullYear()})
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.seasonality}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => fmtBRL(v)}
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 categorias */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Top 10 categorias de despesa — {analytics.context.monthLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.topExpenseCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sem despesas no período.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[280px_1fr] lg:items-center">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.topExpenseCategories}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {analytics.topExpenseCategories.map((c) => (
                        <Cell key={c.id} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => fmtBRL(v)}
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {analytics.topExpenseCategories.map((c) => (
                  <div key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-sm"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="font-medium text-foreground">{c.name}</span>
                      </div>
                      <span className="tabular-nums text-muted-foreground">
                        {fmtBRL(c.total)} · {(c.pct * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={c.pct * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Relatório executivo IA */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Resumo executivo (IA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!ai && !aiLoading && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Clique em <span className="font-semibold text-foreground">Gerar relatório IA</span> para que o sistema analise os dados e produza um resumo automático.
            </div>
          )}
          {aiLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analisando dados…
            </div>
          )}
          {ai && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm leading-relaxed text-foreground">{ai.summary}</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Principais variações
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {ai.highlights?.map((h, i) => (
                      <li key={i} className="flex gap-2">
                        <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="text-foreground">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Insights detectados
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {ai.insights?.map((h, i) => (
                      <li key={i} className="flex gap-2">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span className="text-foreground">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Recomendações
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {ai.recommendations?.map((h, i) => (
                      <li key={i} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span className="text-foreground">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
