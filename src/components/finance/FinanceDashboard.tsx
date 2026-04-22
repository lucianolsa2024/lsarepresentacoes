import { Wallet, TrendingDown, TrendingUp, DollarSign, Plus, Upload, FileBarChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

// Mock data — substituir por dados reais quando os módulos forem conectados
const cashflowProjection = [
  { mes: 'Mai/26', saldo: 145000, entrada: 280000, saida: 195000 },
  { mes: 'Jun/26', saldo: 178000, entrada: 310000, saida: 230000 },
  { mes: 'Jul/26', saldo: 215000, entrada: 295000, saida: 240000 },
];

const monthlyComparison = [
  { mes: 'Nov', entradas: 245000, saidas: 198000 },
  { mes: 'Dez', entradas: 312000, saidas: 240000 },
  { mes: 'Jan', entradas: 278000, saidas: 215000 },
  { mes: 'Fev', entradas: 295000, saidas: 235000 },
  { mes: 'Mar', entradas: 320000, saidas: 250000 },
  { mes: 'Abr', entradas: 305000, saidas: 220000 },
];

const categoryDistribution = [
  { name: 'Comissões', value: 85000 },
  { name: 'Operacional', value: 45000 },
  { name: 'Marketing', value: 28000 },
  { name: 'Impostos', value: 62000 },
  { name: 'Outros', value: 18000 },
];

const COLORS = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(48 96% 53%)', 'hsl(0 84% 60%)', 'hsl(280 65% 60%)'];

const upcomingDues = [
  { id: 1, descricao: 'Comissão Representante - Março', vencimento: '28/04/2026', valor: 18500, tipo: 'pagar', status: 'pendente' },
  { id: 2, descricao: 'NF 4521 - Cliente Alpha Móveis', vencimento: '30/04/2026', valor: 32400, tipo: 'receber', status: 'pendente' },
  { id: 3, descricao: 'Aluguel Showroom', vencimento: '05/05/2026', valor: 8500, tipo: 'pagar', status: 'pendente' },
  { id: 4, descricao: 'NF 4528 - Loja Casa Bela', vencimento: '08/05/2026', valor: 24700, tipo: 'receber', status: 'pendente' },
  { id: 5, descricao: 'DAS Simples Nacional', vencimento: '10/05/2026', valor: 12800, tipo: 'pagar', status: 'pendente' },
];

interface Props {
  onNavigate?: (section: string) => void;
}

export function FinanceDashboard({ onNavigate }: Props) {
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

      {/* Metric cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Saldo Total"
          value={fmtBRL(485200)}
          icon={Wallet}
          tone="primary"
          trend="+12,4%"
          trendUp
        />
        <MetricCard
          title="A Pagar (Mês)"
          value={fmtBRL(215000)}
          icon={TrendingDown}
          tone="danger"
          trend="-3,2%"
          trendUp={false}
        />
        <MetricCard
          title="A Receber (Mês)"
          value={fmtBRL(312000)}
          icon={TrendingUp}
          tone="success"
          trend="+8,7%"
          trendUp
        />
        <MetricCard
          title="Resultado do Mês"
          value={fmtBRL(97000)}
          icon={DollarSign}
          tone="primary"
          trend="+15,1%"
          trendUp
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fluxo de Caixa Projetado</CardTitle>
            <p className="text-xs text-muted-foreground">Próximos 3 meses</p>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashflowProjection}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => fmtBRL(v)}
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Line type="monotone" dataKey="entrada" stroke="hsl(142 76% 36%)" strokeWidth={2} name="Entradas" />
                <Line type="monotone" dataKey="saida" stroke="hsl(0 84% 60%)" strokeWidth={2} name="Saídas" />
                <Line type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" strokeWidth={2} name="Saldo" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entradas vs Saídas</CardTitle>
            <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => fmtBRL(v)}
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar dataKey="entradas" fill="hsl(142 76% 36%)" name="Entradas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" fill="hsl(0 84% 60%)" name="Saídas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 + table */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
            <p className="text-xs text-muted-foreground">Saídas do mês</p>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
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
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Próximos Vencimentos</CardTitle>
            <p className="text-xs text-muted-foreground">5 próximos lançamentos</p>
          </CardHeader>
          <CardContent>
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
                  {upcomingDues.map((d) => (
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'primary' | 'success' | 'danger';
  trend?: string;
  trendUp?: boolean;
}

function MetricCard({ title, value, icon: Icon, tone, trend, trendUp }: MetricCardProps) {
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
          {trend && (
            <span
              className={`text-xs font-medium ${
                trendUp ? 'text-green-600 dark:text-green-500' : 'text-destructive'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
        <p className="mt-4 text-xs font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
