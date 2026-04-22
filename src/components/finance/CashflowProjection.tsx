import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, Lightbulb, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  SCENARIOS,
  buildProjection,
  fmtBRL,
  useCashflowFilters,
  useCashflowProjection,
  type MonthBucket,
} from '@/hooks/useCashflowProjection';
import { RecurringRevenueDialog } from './cashflow/RecurringRevenueDialog';
import { MonthDrillDownDialog } from './cashflow/MonthDrillDownDialog';

export function CashflowProjection() {
  const { entries, companies, categories, recurring, openingBalance, loading, setRecurring } =
    useCashflowProjection();
  const { filters, setFilters } = useCashflowFilters();

  const months = useMemo(
    () => buildProjection(entries, recurring, filters, openingBalance),
    [entries, recurring, filters, openingBalance],
  );

  const [drillDown, setDrillDown] = useState<{ bucket: MonthBucket; prevAcc: number } | null>(null);

  // KPIs do horizonte
  const totalIn = months.reduce((s, m) => s + m.totalIn, 0);
  const totalOut = months.reduce((s, m) => s + m.totalOut, 0);
  const saldo = totalIn - totalOut;
  const finalAcc = months[months.length - 1]?.saldoAcumulado ?? openingBalance;

  // alertas
  const negativeMonths = months.filter((m) => m.saldoAcumulado < 0);
  const worstMonth = negativeMonths.reduce<MonthBucket | null>(
    (acc, m) => (!acc || m.saldoAcumulado < acc.saldoAcumulado ? m : acc),
    null,
  );

  // dados para gráfico (com sinal nas saídas para visual barra dupla)
  const chartData = months.map((m) => ({
    label: m.label,
    Entradas: m.totalIn,
    Saídas: m.totalOut,
    Acumulado: m.saldoAcumulado,
    SaldoMes: m.saldoMes,
  }));

  // comparação real vs projetado: olhar 6 meses anteriores ao startMonth
  const realVsProj = useMemo(() => {
    const start = new Date(filters.startMonth + 'T00:00:00');
    const data: { label: string; Real: number; Projetado: number }[] = [];
    for (let i = 6; i >= 1; i--) {
      const d = new Date(start.getFullYear(), start.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      let real = 0;
      let proj = 0;
      for (const e of entries) {
        if (e.status === 'cancelado') continue;
        if (filters.companyId !== 'all' && e.company_id !== filters.companyId) continue;
        if (filters.categoryId !== 'all' && e.category_id !== filters.categoryId) continue;
        const amt = Number(e.amount) * (e.entry_type === 'a_receber' ? 1 : -1);
        if (e.due_date.slice(0, 7) === key) proj += amt;
        if (e.status === 'pago' && e.paid_date && e.paid_date.slice(0, 7) === key) real += amt;
      }
      data.push({ label, Real: real, Projetado: proj });
    }
    return data;
  }, [entries, filters]);

  return (
    <div className="space-y-4">
      {/* Filtros + ações */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">Mês inicial</Label>
              <Input
                type="month"
                value={filters.startMonth.slice(0, 7)}
                onChange={(e) => setFilters({ ...filters, startMonth: e.target.value + '-01' })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Empresa</Label>
              <Select value={filters.companyId} onValueChange={(v) => setFilters({ ...filters, companyId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={filters.categoryId} onValueChange={(v) => setFilters({ ...filters, categoryId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cenário</Label>
              <Select value={filters.scenario} onValueChange={(v) => setFilters({ ...filters, scenario: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(SCENARIOS).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-end gap-2">
              <RecurringRevenueDialog
                recurring={recurring}
                setRecurring={setRecurring}
                companies={companies}
                categories={categories}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{SCENARIOS[filters.scenario].label}:</span>{' '}
            {SCENARIOS[filters.scenario].description}
          </p>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Entradas (12m)" value={fmtBRL(totalIn)} icon={TrendingUp} tone="success" />
        <Kpi label="Saídas (12m)" value={fmtBRL(totalOut)} icon={TrendingDown} tone="danger" />
        <Kpi label="Resultado projetado" value={fmtBRL(saldo)} icon={Wallet} tone={saldo >= 0 ? 'success' : 'danger'} />
        <Kpi label="Saldo final estimado" value={fmtBRL(finalAcc)} icon={Wallet} tone={finalAcc >= 0 ? 'success' : 'danger'} />
      </div>

      {/* Alertas */}
      {worstMonth && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção: saldo negativo previsto</AlertTitle>
          <AlertDescription className="space-y-1">
            <div>
              {negativeMonths.length} mês(es) com saldo acumulado negativo. Pior projeção em{' '}
              <strong>{worstMonth.label}</strong> ({fmtBRL(worstMonth.saldoAcumulado)}).
            </div>
            <div className="flex items-start gap-2 text-xs">
              <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Ações sugeridas: antecipar recebíveis, renegociar fornecedores, revisar parcelamentos ou
                obter capital de giro até <strong>{worstMonth.label}</strong>.
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Timeline 12 meses */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Timeline — próximos 12 meses</CardTitle>
          {loading && <Badge variant="secondary">Carregando…</Badge>}
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmtBRL(v as number)} tick={{ fontSize: 12 }} width={80} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Legend />
              <Bar dataKey="Entradas" fill="hsl(142 76% 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Saídas" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="Acumulado" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cards mensais clicáveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo mensal — clique para detalhar o dia a dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {months.map((m, idx) => {
              const prev = idx === 0 ? openingBalance : months[idx - 1].saldoAcumulado;
              const negative = m.saldoAcumulado < 0;
              return (
                <button
                  key={m.key}
                  onClick={() => setDrillDown({ bucket: m, prevAcc: prev })}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors hover:bg-muted/50',
                    negative ? 'border-destructive/50 bg-destructive/5' : 'border-border',
                    m.isPast && 'opacity-80',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold capitalize">{m.label}</span>
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-1 text-xs">
                    <span className="text-emerald-600">↑ {fmtBRL(m.totalIn)}</span>
                    <span className="text-destructive text-right">↓ {fmtBRL(m.totalOut)}</span>
                  </div>
                  <div className="mt-2 border-t border-border pt-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Saldo:</span>
                      <span className={cn('font-medium', m.saldoMes >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                        {fmtBRL(m.saldoMes)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Acum.:</span>
                      <span className={cn('font-bold', m.saldoAcumulado >= 0 ? 'text-emerald-700' : 'text-destructive')}>
                        {fmtBRL(m.saldoAcumulado)}
                      </span>
                    </div>
                  </div>
                  {m.recurringIn > 0 && (
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      Recorrentes: {fmtBRL(m.recurringIn * SCENARIOS[filters.scenario].inFactor)}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Real vs Projetado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Real vs Projetado — últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer>
            <ComposedChart data={realVsProj}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmtBRL(v as number)} tick={{ fontSize: 12 }} width={80} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Legend />
              <Bar dataKey="Projetado" fill="hsl(217 91% 60% / 0.5)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Real" fill="hsl(217 91% 50%)" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <MonthDrillDownDialog
        open={!!drillDown}
        onOpenChange={(o) => !o && setDrillDown(null)}
        bucket={drillDown?.bucket ?? null}
        prevAcumulado={drillDown?.prevAcc ?? 0}
        recurring={recurring}
        filters={filters}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone: 'success' | 'danger' | 'neutral';
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-500/10 text-emerald-600'
      : tone === 'danger'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-primary/10 text-primary';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', toneClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="truncate text-lg font-bold text-foreground">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
