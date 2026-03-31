import { useRepDashboard } from '@/hooks/useRepDashboard';
import { useRepresentatives } from '@/hooks/useRepresentatives';
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
  Trophy,
  Loader2,
  BarChart3,
} from 'lucide-react';

const fmt = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtPct = (v: number | null | undefined) => {
  if (v == null) return '—';
  return `${v.toFixed(1)}%`;
};

const fmtRatioPct = (v: number | null | undefined) => {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
};

const fmtInt = (v: number | null | undefined) => (v ?? 0).toLocaleString('pt-BR');

function ChangeIndicator({ value }: { value: number | null | undefined }) {
  if (value == null) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Minus className="h-3.5 w-3.5" />
        —
      </span>
    );
  }

  if (value > 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-whatsapp">
        <TrendingUp className="h-3.5 w-3.5" />+{value.toFixed(1)}%
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-destructive">
        <TrendingDown className="h-3.5 w-3.5" />
        {value.toFixed(1)}%
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <Minus className="h-3.5 w-3.5" />
      0,0%
    </span>
  );
}

export function RepHomeDashboard() {
  const {
    monthData,
    compare90d,
    mtdYoy,
    inactiveClients,
    topClients90d,
    loading,
    isAdmin,
  } = useRepDashboard();

  const { emailToName } = useRepresentatives();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const goalPct = Math.min((monthData?.goal_achieved_pct ?? 0) * 100, 100);
  const soldMonth = monthData?.sold_month ?? 0;
  const goalValue = monthData?.goal_value ?? 0;
  const remainingToGoal = monthData?.remaining_to_goal ?? 0;

  return (
    <div className="space-y-6">
      {/* Meta + YoY MTD */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" />
              Meta do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Vendido no mês</p>
                <p className="text-3xl font-bold">{fmt(soldMonth)}</p>
              </div>

              <div className="text-right">
                <p className="text-sm text-muted-foreground">Meta</p>
                <p className="text-xl font-semibold">{fmt(goalValue)}</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{fmtRatioPct(monthData?.goal_achieved_pct)} atingido</span>
                <span>Faltam {fmt(remainingToGoal)}</span>
              </div>
              <Progress value={goalPct} className="h-3" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Saldo para meta</p>
                <p className="text-lg font-bold">{fmt(remainingToGoal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              YoY MTD
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Mês atual até hoje</p>
              <p className="text-2xl font-bold">{fmt(mtdYoy?.revenue_mtd_current)}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Mesmo período ano anterior</p>
              <p className="text-lg font-semibold">{fmt(mtdYoy?.revenue_mtd_previous)}</p>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div>
                <p className="text-xs text-muted-foreground">Variação</p>
                <p className="text-base font-semibold">{fmt(mtdYoy?.revenue_mtd_diff)}</p>
              </div>
              <ChangeIndicator value={mtdYoy?.revenue_mtd_yoy_pct} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparativo 90 dias */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento 90d</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(compare90d?.revenue_90d)}</p>
            <div className="mt-1 flex items-center justify-between">
              <ChangeIndicator value={compare90d?.revenue_change_pct} />
              <p className="text-xs text-muted-foreground">
                Ant.: {fmt(compare90d?.revenue_prev_90d)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume 90d</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtInt(compare90d?.volume_90d)}</p>
            <div className="mt-1 flex items-center justify-between">
              <ChangeIndicator value={compare90d?.volume_change_pct} />
              <p className="text-xs text-muted-foreground">
                Ant.: {fmtInt(compare90d?.volume_prev_90d)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos 90d</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtInt(compare90d?.orders_90d)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Anterior: {fmtInt(compare90d?.orders_prev_90d)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio 90d</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(compare90d?.ticket_90d)}</p>
            <div className="mt-1 flex items-center justify-between">
              <ChangeIndicator value={compare90d?.ticket_change_pct} />
              <p className="text-xs text-muted-foreground">
                Ant.: {fmt(compare90d?.ticket_prev_90d)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top clientes 90d + clientes inativos */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-warning" />
              Top 5 Clientes — Últimos 90 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClients90d.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum dado encontrado para os últimos 90 dias.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Cliente</TableHead>
                      {isAdmin && <TableHead>Representante</TableHead>}
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Ticket</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topClients90d.map((client, index) => (
                      <TableRow key={`${client.client_id}-${index}`}>
                        <TableCell>
                          <Badge variant="secondary">{index + 1}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{client.client_name}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-sm text-muted-foreground">
                            {client.owner_email
                              ? (emailToName[client.owner_email] || client.owner_email)
                              : '—'}
                          </TableCell>
                        )}
                        <TableCell className="text-right">{fmt(client.revenue_90d)}</TableCell>
                        <TableCell className="text-right">{fmtInt(client.orders_90d)}</TableCell>
                        <TableCell className="text-right">{fmt(client.ticket_90d)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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
              <div className="max-h-[420px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      {isAdmin && <TableHead>Representante</TableHead>}
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
                        {isAdmin && (
                          <TableCell className="text-sm text-muted-foreground">
                            {c.owner_email
                              ? (emailToName[c.owner_email] || c.owner_email)
                              : '—'}
                          </TableCell>
                        )}
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
      </div>

      {/* Share de Loja */}
      <RepShareWidget />
    </div>
  );
}
