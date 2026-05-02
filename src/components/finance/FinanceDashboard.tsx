import { useEffect, useMemo, useState } from 'react';
import { Wallet, TrendingDown, TrendingUp, DollarSign, Plus, Upload, FileBarChart, ArrowUpRight, ArrowDownRight, Inbox } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { supabase } from '@/integrations/supabase/client';

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const COLORS = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(48 96% 53%)', 'hsl(0 84% 60%)', 'hsl(280 65% 60%)'];

interface Props {
  onNavigate?: (section: string) => void;
}

interface UpcomingDue {
  id: string;
  descricao: string;
  vencimento: string;
  valor: number;
  tipo: 'pagar' | 'receber';
}

interface MonthlyPoint {
  mes: string;
  entradas: number;
  saidas: number;
}

interface CategoryPoint {
  name: string;
  value: number;
}

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().split('T')[0];
  return { start: iso(start), end: iso(end) };
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function FinanceDashboard({ onNavigate }: Props) {
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthPayable, setMonthPayable] = useState(0);
  const [monthReceivable, setMonthReceivable] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [accountsList, setAccountsList] = useState<Array<{ id: string; name: string; bank_name: string | null; initial_balance: number; color: string | null }>>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyPoint[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryPoint[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingDue[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const { start, end } = monthRange(today);
        const todayIso = today.toISOString().split('T')[0];

        // 6-month range for entradas vs saidas
        const sixStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        const sixStartIso = sixStart.toISOString().split('T')[0];

        const [accountsRes, payRes, recRes, monthlyRes, catRes, upRes, overdueRes] = await Promise.all([
          supabase.from('finance_bank_accounts').select('id, name, bank_name, initial_balance, color').eq('active', true).order('name'),
          supabase
            .from('finance_entries')
            .select('amount')
            .eq('entry_type', 'a_pagar')
            .eq('status', 'pendente')
            .gte('due_date', start)
            .lte('due_date', end),
          supabase
            .from('finance_entries')
            .select('amount')
            .eq('entry_type', 'a_receber')
            .eq('status', 'pendente')
            .gte('due_date', start)
            .lte('due_date', end),
          supabase
            .from('finance_entries')
            .select('amount, entry_type, due_date')
            .gte('due_date', sixStartIso)
            .lte('due_date', end),
          supabase
            .from('finance_entries')
            .select('amount, finance_categories(name)')
            .eq('entry_type', 'a_pagar')
            .eq('status', 'pendente')
            .gte('due_date', start)
            .lte('due_date', end),
          supabase
            .from('finance_entries')
            .select('id, description, counterparty, due_date, amount, entry_type')
            .eq('status', 'pendente')
            .gte('due_date', todayIso)
            .order('due_date', { ascending: true })
            .limit(5),
          supabase
            .from('finance_entries')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pendente')
            .lt('due_date', todayIso),
        ]);

        const balance = (accountsRes.data ?? []).reduce((s, r: any) => s + Number(r.initial_balance ?? 0), 0);
        const payable = (payRes.data ?? []).reduce((s, r: any) => s + Number(r.amount ?? 0), 0);
        const receivable = (recRes.data ?? []).reduce((s, r: any) => s + Number(r.amount ?? 0), 0);
        setAccountsList((accountsRes.data as any) ?? []);
        setOverdueCount(overdueRes.count ?? 0);

        // Monthly grouping
        const buckets = new Map<string, MonthlyPoint>();
        for (let i = 0; i < 6; i++) {
          const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          buckets.set(key, { mes: MONTH_LABELS[d.getMonth()], entradas: 0, saidas: 0 });
        }
        (monthlyRes.data ?? []).forEach((r: any) => {
          const d = new Date(r.due_date);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const b = buckets.get(key);
          if (!b) return;
          if (r.entry_type === 'a_receber') b.entradas += Number(r.amount ?? 0);
          else if (r.entry_type === 'a_pagar') b.saidas += Number(r.amount ?? 0);
        });

        // Category distribution
        const catMap = new Map<string, number>();
        (catRes.data ?? []).forEach((r: any) => {
          const name = r.finance_categories?.name ?? 'Sem categoria';
          catMap.set(name, (catMap.get(name) ?? 0) + Number(r.amount ?? 0));
        });
        const catArr: CategoryPoint[] = Array.from(catMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        const upArr: UpcomingDue[] = (upRes.data ?? []).map((r: any) => ({
          id: r.id,
          descricao: r.description + (r.counterparty ? ` — ${r.counterparty}` : ''),
          vencimento: new Date(r.due_date + 'T00:00:00').toLocaleDateString('pt-BR'),
          valor: Number(r.amount ?? 0),
          tipo: r.entry_type === 'a_pagar' ? 'pagar' : 'receber',
        }));

        setTotalBalance(balance);
        setMonthPayable(payable);
        setMonthReceivable(receivable);
        setMonthlyComparison(Array.from(buckets.values()));
        setCategoryDistribution(catArr);
        setUpcoming(upArr);
      } catch (err) {
        console.error('Erro ao carregar dashboard financeiro:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const monthResult = useMemo(() => monthReceivable - monthPayable, [monthReceivable, monthPayable]);
  const hasAnyData =
    totalBalance !== 0 || monthPayable !== 0 || monthReceivable !== 0 || upcoming.length > 0 || categoryDistribution.length > 0;

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onNavigate?.('lancamentos')} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Lançamento
        </Button>
        <Button variant="outline" onClick={() => onNavigate?.('upload')} className="gap-2">
          <Upload className="h-4 w-4" /> Upload NF
        </Button>
        <Button variant="outline" onClick={() => onNavigate?.('dre')} className="gap-2">
          <FileBarChart className="h-4 w-4" /> Ver DRE
        </Button>
      </div>

      {/* Overdue alert */}
      {!loading && overdueCount > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-destructive">
                  {overdueCount} {overdueCount === 1 ? 'lançamento vencido' : 'lançamentos vencidos'}
                </p>
                <p className="text-xs text-muted-foreground">Verifique os pendentes com vencimento anterior a hoje.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigate?.('pagar')}>
              Ver contas a pagar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metric cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Saldo Total" value={loading ? '—' : fmtBRL(totalBalance)} icon={Wallet} tone="primary" />
        <MetricCard title="A Pagar (Mês)" value={loading ? '—' : fmtBRL(monthPayable)} icon={TrendingDown} tone="danger" />
        <MetricCard title="A Receber (Mês)" value={loading ? '—' : fmtBRL(monthReceivable)} icon={TrendingUp} tone="success" />
        <MetricCard title="Resultado do Mês" value={loading ? '—' : fmtBRL(monthResult)} icon={DollarSign} tone={monthResult >= 0 ? 'success' : 'danger'} />
      </div>

      {/* Saldo por conta */}
      {!loading && accountsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saldo por Conta</CardTitle>
            <p className="text-xs text-muted-foreground">Saldo inicial cadastrado em cada conta bancária ativa.</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {accountsList.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-1.5 shrink-0 rounded-full"
                      style={{ background: a.color ?? 'hsl(var(--primary))' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{a.bank_name || '—'}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-lg font-bold text-foreground">{fmtBRL(Number(a.initial_balance ?? 0))}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !hasAnyData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Nenhum lançamento encontrado.</p>
              <p className="text-sm text-muted-foreground">Importe seus dados ou adicione um novo lançamento para visualizar o dashboard.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onNavigate?.('lancamentos')} className="gap-2">
                <Plus className="h-4 w-4" /> Novo Lançamento
              </Button>
              <Button variant="outline" onClick={() => onNavigate?.('upload')} className="gap-2">
                <Upload className="h-4 w-4" /> Upload NF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart: Entradas vs Saídas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entradas vs Saídas</CardTitle>
          <p className="text-xs text-muted-foreground">Últimos 6 meses (por vencimento)</p>
        </CardHeader>
        <CardContent className="h-[280px]">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : monthlyComparison.every((m) => m.entradas === 0 && m.saidas === 0) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => fmtBRL(v)}
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar dataKey="entradas" fill="hsl(142 76% 36%)" name="Entradas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" fill="hsl(0 84% 60%)" name="Saídas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Charts row 2 + table */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
            <p className="text-xs text-muted-foreground">A pagar do mês</p>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : categoryDistribution.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                    {categoryDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => fmtBRL(v)}
                    contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Próximos Vencimentos</CardTitle>
            <p className="text-xs text-muted-foreground">5 próximos lançamentos pendentes</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8" />
                Nenhum lançamento encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcoming.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.descricao}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.vencimento}</TableCell>
                        <TableCell>
                          {d.tipo === 'pagar' ? (
                            <Badge variant="outline" className="border-destructive/40 text-destructive gap-1">
                              <ArrowDownRight className="h-3 w-3" /> Pagar
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-600/40 text-green-700 dark:text-green-500 gap-1">
                              <ArrowUpRight className="h-3 w-3" /> Receber
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">{fmtBRL(d.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
      <Inbox className="h-8 w-8" />
      Nenhum dado no período.
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'primary' | 'success' | 'danger';
}

function MetricCard({ title, value, icon: Icon, tone }: MetricCardProps) {
  const toneClass = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-600 dark:text-green-500',
    danger: 'bg-destructive/10 text-destructive',
  }[tone];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-4 text-xs font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
