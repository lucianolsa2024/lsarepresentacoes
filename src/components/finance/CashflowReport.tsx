import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  buildCashflow,
  filterEntries,
  fmtBRL,
  useFinanceReports,
  useReportFilters,
} from '@/hooks/useFinanceReports';
import { ReportFiltersBar } from './ReportFiltersBar';

export function CashflowReport() {
  const { entries, companies, loading } = useFinanceReports();
  const { filters, setFilters } = useReportFilters();

  const filtered = useMemo(() => filterEntries(entries, filters), [entries, filters]);
  const buckets = useMemo(() => buildCashflow(filtered, filters, 0), [filtered, filters]);

  const totalIn = buckets.reduce((s, b) => s + b.realizadoEntradas + b.projetadoEntradas, 0);
  const totalOut = buckets.reduce((s, b) => s + b.realizadoSaidas + b.projetadoSaidas, 0);
  const saldo = totalIn - totalOut;

  // alerta: saldo acumulado negativo em algum mês projetado
  const negMonth = buckets.find((b) => b.saldoAcumulado < 0);

  return (
    <div className="space-y-4">
      <ReportFiltersBar filters={filters} setFilters={setFilters} companies={companies} />

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Entradas" value={fmtBRL(totalIn)} icon={TrendingUp} tone="success" />
        <KpiCard label="Saídas" value={fmtBRL(totalOut)} icon={TrendingDown} tone="danger" />
        <KpiCard label="Saldo do período" value={fmtBRL(saldo)} icon={Wallet} tone={saldo >= 0 ? 'success' : 'danger'} />
        <KpiCard
          label="Maior saída mensal"
          value={fmtBRL(Math.max(0, ...buckets.map((b) => b.realizadoSaidas + b.projetadoSaidas)))}
          icon={TrendingDown}
          tone="neutral"
        />
      </div>

      {negMonth && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção ao caixa</AlertTitle>
          <AlertDescription>
            Projeção indica saldo acumulado negativo em <strong>{negMonth.label}</strong> ({fmtBRL(negMonth.saldoAcumulado)}).
            Considere antecipar recebíveis ou renegociar pagamentos.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Fluxo mensal — realizado e projetado</CardTitle>
          {loading && <Badge variant="secondary">Carregando…</Badge>}
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer>
            <ComposedChart data={buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmtBRL(v as number)} tick={{ fontSize: 12 }} width={80} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Legend />
              <Bar dataKey="realizadoEntradas" stackId="in" name="Entradas (real.)" fill="hsl(142 76% 36%)" />
              <Bar dataKey="projetadoEntradas" stackId="in" name="Entradas (proj.)" fill="hsl(142 76% 60%)" />
              <Bar dataKey="realizadoSaidas" stackId="out" name="Saídas (real.)" fill="hsl(0 84% 60%)" />
              <Bar dataKey="projetadoSaidas" stackId="out" name="Saídas (proj.)" fill="hsl(0 84% 75%)" />
              <Line
                type="monotone"
                dataKey="saldoAcumulado"
                name="Saldo acumulado"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Entradas (real.)</TableHead>
                  <TableHead className="text-right">Entradas (proj.)</TableHead>
                  <TableHead className="text-right">Saídas (real.)</TableHead>
                  <TableHead className="text-right">Saídas (proj.)</TableHead>
                  <TableHead className="text-right">Saldo do mês</TableHead>
                  <TableHead className="text-right">Acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buckets.map((b) => (
                  <TableRow key={b.key}>
                    <TableCell className="font-medium">{b.label}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">{fmtBRL(b.realizadoEntradas)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmtBRL(b.projetadoEntradas)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{fmtBRL(b.realizadoSaidas)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmtBRL(b.projetadoSaidas)}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums font-medium',
                        b.saldoMes >= 0 ? 'text-emerald-600' : 'text-destructive',
                      )}
                    >
                      {fmtBRL(b.saldoMes)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums font-semibold',
                        b.saldoAcumulado >= 0 ? 'text-emerald-700' : 'text-destructive',
                      )}
                    >
                      {fmtBRL(b.saldoAcumulado)}
                    </TableCell>
                  </TableRow>
                ))}
                {buckets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      Sem dados no período selecionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
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
