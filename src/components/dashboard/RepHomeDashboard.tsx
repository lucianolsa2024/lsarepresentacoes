import { useRepDashboard } from '@/hooks/useRepDashboard';
import { RepShareWidget } from './RepShareWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Gauge,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Loader2,
} from 'lucide-react';

const fmt = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtPct = (v: number | null | undefined) => {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
};

const fmtInt = (v: number | null | undefined) => (v ?? 0).toLocaleString('pt-BR');

function ChangeIndicator({ value }: { value: number | null | undefined }) {
  if (value == null) return <Minus className="h-4 w-4 text-muted-foreground" />;
  if (value > 0)
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-whatsapp">
        <TrendingUp className="h-3.5 w-3.5" />+{(value * 100).toFixed(1)}%
      </span>
    );
  if (value < 0)
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-destructive">
        <TrendingDown className="h-3.5 w-3.5" />{(value * 100).toFixed(1)}%
      </span>
    );
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function RepHomeDashboard() {
  const { monthData, compare90d, inactiveClients, loading } = useRepDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const goalPct = Math.min((monthData?.goal_achieved_pct ?? 0) * 100, 100);

  return (
    <div className="space-y-6">
      {/* ── Meta do Mês ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5" />
            Meta do Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Vendido</p>
              <p className="text-3xl font-bold">{fmt(monthData?.sold_month)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Meta</p>
              <p className="text-xl font-semibold">{fmt(monthData?.goal_value)}</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{fmtPct(monthData?.goal_achieved_pct)} atingido</span>
              <span>Faltam {fmt(monthData?.remaining_to_goal)}</span>
            </div>
            <Progress value={goalPct} className="h-3" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Ritmo atual / dia</p>
              <p className="text-lg font-bold">{fmt(monthData?.daily_pace_so_far)}</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Ritmo necessário / dia</p>
              <p className="text-lg font-bold">
                {monthData?.required_daily_pace_remaining != null
                  ? fmt(monthData.required_daily_pace_remaining)
                  : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Comparativo 90 dias ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Faturamento 90d</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(compare90d?.revenue_90d)}</p>
            <ChangeIndicator value={compare90d?.revenue_change_pct} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Volume 90d</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtInt(compare90d?.volume_90d)}</p>
            <ChangeIndicator value={compare90d?.volume_change_pct} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pedidos 90d</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtInt(compare90d?.orders_90d)}</p>
            <p className="text-xs text-muted-foreground">
              Anterior: {fmtInt(compare90d?.orders_prev_90d)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Ticket Médio 90d</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(compare90d?.ticket_90d)}</p>
            <ChangeIndicator value={compare90d?.ticket_change_pct} />
          </CardContent>
        </Card>
      </div>

      {/* ── Clientes Inativos 60d ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Clientes sem Compra há 60+ dias
            <Badge variant="secondary" className="ml-auto">
              {inactiveClients.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inactiveClients.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum cliente inativo no momento 🎉
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Dias s/ compra</TableHead>
                    <TableHead className="text-right">Faturamento 12m</TableHead>
                    <TableHead className="text-right">Pedidos 12m</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveClients.map((c) => (
                    <TableRow key={c.client_id}>
                      <TableCell className="font-medium">{c.client_name}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            (c.days_since_last_purchase ?? 0) > 90
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {c.days_since_last_purchase}d
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{fmt(c.revenue_12m)}</TableCell>
                      <TableCell className="text-right">{fmtInt(c.orders_12m)}</TableCell>
                      <TableCell className="text-right">{fmt(c.ticket_avg_12m)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share de Loja */}
      <RepShareWidget />
    </div>
  );
}
