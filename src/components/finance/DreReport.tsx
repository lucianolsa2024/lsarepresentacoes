import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, FileBarChart, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  buildDre,
  filterEntries,
  fmtBRL,
  fmtBRLDetail,
  fmtPct,
  groupByMonth,
  useFinanceReports,
  useReportFilters,
  type DreLine,
} from '@/hooks/useFinanceReports';
import { ReportFiltersBar } from './ReportFiltersBar';

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(142 76% 36%)',
  'hsl(48 96% 53%)',
  'hsl(0 84% 60%)',
  'hsl(280 65% 60%)',
  'hsl(199 89% 48%)',
  'hsl(24 95% 53%)',
];

export function DreReport() {
  const { entries, categories, companies, loading } = useFinanceReports();
  const { filters, setFilters } = useReportFilters();

  const filtered = useMemo(() => filterEntries(entries, filters), [entries, filters]);
  const dre = useMemo(() => buildDre(filtered, categories), [filtered, categories]);
  const monthly = useMemo(() => groupByMonth(filtered, filters), [filtered, filters]);

  const exportPdf = () => {
    // Impressão nativa (gera PDF via browser). Mantém dependências enxutas.
    window.print();
  };

  const empresaLabel =
    filters.companyId === 'all'
      ? 'Consolidado'
      : companies.find((c) => c.id === filters.companyId)?.name ?? '—';

  return (
    <div className="space-y-4">
      <ReportFiltersBar
        filters={filters}
        setFilters={setFilters}
        companies={companies}
        onExport={exportPdf}
        exportLabel="Exportar PDF"
      />

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard
          label="Receitas"
          value={fmtBRL(dre.totalReceitas)}
          icon={TrendingUp}
          tone="success"
        />
        <KpiCard
          label="Despesas"
          value={fmtBRL(dre.totalDespesas)}
          icon={TrendingDown}
          tone="danger"
        />
        <KpiCard
          label="Resultado"
          value={fmtBRL(dre.resultado)}
          icon={FileBarChart}
          tone={dre.resultado >= 0 ? 'success' : 'danger'}
        />
        <KpiCard
          label="Margem"
          value={fmtPct(dre.margem)}
          icon={Percent}
          tone={dre.margem >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* DRE estruturado com drill-down */}
      <Card className="print:shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            DRE — {empresaLabel}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {filters.start} → {filters.end} · {filters.basis === 'caixa' ? 'Caixa' : 'Competência'}
            </span>
          </CardTitle>
          {loading && <Badge variant="secondary">Carregando…</Badge>}
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60%]">Conta</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">% Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SectionRow title="(+) Receitas operacionais" total={dre.totalReceitas} base={dre.totalReceitas} tone="success" />
                {dre.receitas.map((line) => (
                  <DreLineRow key={`r-${line.id}`} line={line} base={dre.totalReceitas} />
                ))}
                {dre.receitas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      Sem receitas no período.
                    </TableCell>
                  </TableRow>
                )}

                <SectionRow title="(−) Despesas operacionais" total={-dre.totalDespesas} base={dre.totalReceitas} tone="danger" />
                {dre.despesas.map((line) => (
                  <DreLineRow key={`d-${line.id}`} line={line} base={dre.totalReceitas} negative />
                ))}
                {dre.despesas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      Sem despesas no período.
                    </TableCell>
                  </TableRow>
                )}

                <TableRow className="border-t-2 bg-muted/40 font-semibold">
                  <TableCell>(=) Resultado do período</TableCell>
                  <TableCell className={cn('text-right', dre.resultado >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                    {fmtBRL(dre.resultado)}
                  </TableCell>
                  <TableCell className="text-right">{fmtPct(dre.margem)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução mensal</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => fmtBRL(v as number)} tick={{ fontSize: 12 }} width={80} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend />
                <Bar dataKey="receitas" name="Receitas" fill="hsl(142 76% 36%)" />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(0 84% 60%)" />
                <Bar dataKey="resultado" name="Resultado" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de despesas</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {dre.despesas.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem despesas no período.
              </div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={dre.despesas}
                    dataKey="total"
                    nameKey="name"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={2}
                  >
                    {dre.despesas.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
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
  icon: typeof FileBarChart;
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

function SectionRow({
  title,
  total,
  base,
  tone,
}: {
  title: string;
  total: number;
  base: number;
  tone: 'success' | 'danger';
}) {
  const pct = base > 0 ? Math.abs(total) / base : 0;
  return (
    <TableRow className="bg-muted/30 font-semibold">
      <TableCell>{title}</TableCell>
      <TableCell className={cn('text-right', tone === 'success' ? 'text-emerald-600' : 'text-destructive')}>
        {fmtBRL(total)}
      </TableCell>
      <TableCell className="text-right text-muted-foreground">{fmtPct(pct)}</TableCell>
    </TableRow>
  );
}

function DreLineRow({ line, base, negative = false }: { line: DreLine; base: number; negative?: boolean }) {
  const [open, setOpen] = useState(false);
  const pct = base > 0 ? line.total / base : 0;
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => setOpen((v) => !v)}>
        <TableCell>
          <div className="flex items-center gap-2 pl-4">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <span>{line.name}</span>
            <Badge variant="outline" className="ml-1 text-[10px]">
              {line.entries.length}
            </Badge>
          </div>
        </TableCell>
        <TableCell className={cn('text-right tabular-nums', negative ? 'text-destructive' : 'text-emerald-600')}>
          {negative ? '−' : ''}{fmtBRL(line.total)}
        </TableCell>
        <TableCell className="text-right text-muted-foreground">{fmtPct(pct)}</TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={3} className="bg-muted/10 p-0">
            <div className="px-6 py-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 text-xs">Vencimento</TableHead>
                    <TableHead className="h-8 text-xs">Descrição</TableHead>
                    <TableHead className="h-8 text-xs">Contraparte</TableHead>
                    <TableHead className="h-8 text-right text-xs">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {line.entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="py-1.5 text-xs">{e.due_date.split('-').reverse().join('/')}</TableCell>
                      <TableCell className="py-1.5 text-xs">{e.description}</TableCell>
                      <TableCell className="py-1.5 text-xs text-muted-foreground">{e.counterparty ?? '—'}</TableCell>
                      <TableCell className="py-1.5 text-right text-xs tabular-nums">{fmtBRLDetail(Number(e.amount))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
