import { useState } from 'react';
import { format, subMonths, addMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRepDashboard } from '@/hooks/useRepDashboard';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { RepShareWidget } from './RepShareWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Trophy,
  Loader2,
  BarChart3,
  Factory,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';

const fmt = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtShort = (v: number | null | undefined) => {
  const n = v ?? 0;
  if (n >= 1000) return `R$ ${(n / 1000).toFixed(1)}k`;
  return fmt(n);
};

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
  const [selectedDate, setSelectedDate] = useState(() => startOfMonth(new Date()));

  const selectedMonth = format(selectedDate, 'yyyy-MM-dd');
  const isCurrentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd') === selectedMonth;

  const {
    monthData,
    compare90d,
    mtdYoy,
    inactiveClients,
    topClients90d,
    mtdBySupplier,
    mtdByClient,
    loading,
    isAdmin,
  } = useRepDashboard(selectedMonth);

  const { emailToName } = useRepresentatives();

  const handlePrevMonth = () => setSelectedDate((d) => startOfMonth(subMonths(d, 1)));
  const handleNextMonth = () => {
    const next = startOfMonth(addMonths(selectedDate, 1));
    if (next <= startOfMonth(new Date())) setSelectedDate(next);
  };
  const handleCurrentMonth = () => setSelectedDate(startOfMonth(new Date()));

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
    <div className="space-y-4 sm:space-y-6">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-base sm:text-lg font-semibold capitalize">
            {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isCurrentMonth ? 'default' : 'outline'}
            size="sm"
            onClick={handleCurrentMonth}
            className="h-8 text-xs"
          >
            Atual
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            disabled={isCurrentMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Meta + YoY MTD */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Target className="h-5 w-5" />
              Meta do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Vendido</p>
                <p className="text-2xl sm:text-3xl font-bold">{fmt(soldMonth)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm text-muted-foreground">Meta</p>
                <p className="text-lg sm:text-xl font-semibold">{fmt(goalValue)}</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{fmtRatioPct(monthData?.goal_achieved_pct)} atingido</span>
                <span>Faltam {fmtShort(remainingToGoal)}</span>
              </div>
              <Progress value={goalPct} className="h-3" />
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="rounded-lg bg-muted p-2 sm:p-3 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Ritmo atual/dia</p>
                <p className="text-sm sm:text-lg font-bold mt-0.5">{fmtShort(monthData?.daily_pace_so_far)}</p>
              </div>
              <div className="rounded-lg bg-muted p-2 sm:p-3 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Ritmo necessário</p>
                <p className="text-sm sm:text-lg font-bold mt-0.5">
                  {monthData?.required_daily_pace_remaining != null
                    ? fmtShort(monthData.required_daily_pace_remaining)
                    : '—'}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-2 sm:p-3 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Saldo p/ meta</p>
                <p className="text-sm sm:text-lg font-bold mt-0.5">{fmtShort(remainingToGoal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="h-5 w-5" />
              YoY MTD
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Mês atual até hoje</p>
              <p className="text-xl sm:text-2xl font-bold">{fmt(mtdYoy?.revenue_mtd_current)}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Mesmo período ano anterior</p>
              <p className="text-base sm:text-lg font-semibold">{fmt(mtdYoy?.revenue_mtd_previous)}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted p-2 sm:p-3">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Variação</p>
                <p className="text-sm sm:text-base font-semibold">{fmt(mtdYoy?.revenue_mtd_diff)}</p>
              </div>
              <ChangeIndicator value={mtdYoy?.revenue_mtd_yoy_pct} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MTD por Fornecedor + MTD por Cliente */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Factory className="h-5 w-5 text-primary" />
              Vendas por Fornecedor
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {mtdBySupplier.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma venda neste mês.
              </p>
            ) : (
              <div className="space-y-2.5">
                {mtdBySupplier.map((s) => {
                  const totalRevenue = mtdBySupplier.reduce((sum, item) => sum + (item.revenue_mtd ?? 0), 0);
                  const pct = totalRevenue > 0 ? ((s.revenue_mtd ?? 0) / totalRevenue) * 100 : 0;
                  return (
                    <div key={s.supplier} className="space-y-1">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-medium truncate mr-2">{s.supplier}</span>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {fmtShort(s.revenue_mtd)} · {fmtInt(s.orders_mtd)} ped.
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
                <div className="mt-2 rounded-lg bg-muted p-2 sm:p-3 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium">Total MTD</span>
                  <span className="text-xs sm:text-sm font-bold">
                    {fmt(mtdBySupplier.reduce((sum, s) => sum + (s.revenue_mtd ?? 0), 0))}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-5 w-5 text-primary" />
              Top Clientes do Mês
              <Badge variant="secondary" className="ml-auto text-xs">
                {mtdByClient.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {mtdByClient.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma venda neste mês.
              </p>
            ) : (
              <div className="space-y-2">
                {/* Mobile: card list */}
                <div className="sm:hidden space-y-2">
                  {mtdByClient.map((c, i) => (
                    <div key={c.client_id ?? i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="secondary" className="shrink-0 text-xs">{i + 1}</Badge>
                        <span className="text-sm font-medium truncate">{c.client_name}</span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-semibold">{fmtShort(c.revenue_mtd)}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtInt(c.orders_mtd)} ped. · TM {fmtShort(c.ticket_mtd)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop: table */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Faturamento</TableHead>
                        <TableHead className="text-right">Pedidos</TableHead>
                        <TableHead className="text-right">Ticket</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mtdByClient.map((c, i) => (
                        <TableRow key={c.client_id ?? i}>
                          <TableCell>
                            <Badge variant="secondary">{i + 1}</Badge>
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {c.client_name}
                          </TableCell>
                          <TableCell className="text-right">{fmt(c.revenue_mtd)}</TableCell>
                          <TableCell className="text-right">{fmtInt(c.orders_mtd)}</TableCell>
                          <TableCell className="text-right">{fmt(c.ticket_mtd)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top clientes 90d + clientes inativos */}
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Trophy className="h-5 w-5 text-warning" />
              Top 5 — 90 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {topClients90d.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum dado nos últimos 90 dias.
              </p>
            ) : (
              <>
                {/* Mobile: compact list */}
                <div className="sm:hidden space-y-2">
                  {topClients90d.map((client, index) => (
                    <div key={`${client.client_id}-${index}`} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="secondary" className="shrink-0 text-xs">{index + 1}</Badge>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{client.client_name}</p>
                          {isAdmin && client.owner_email && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {emailToName[client.owner_email] || client.owner_email}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-semibold">{fmtShort(client.revenue_90d)}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtInt(client.orders_90d)} ped.</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop: table */}
                <div className="hidden sm:block overflow-x-auto">
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
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Sem compra 60+ dias
              <Badge variant="secondary" className="ml-auto text-xs">
                {inactiveClients.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {inactiveClients.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum cliente inativo 🎉
              </p>
            ) : (
              <>
                {/* Mobile: compact list */}
                <div className="sm:hidden max-h-[350px] overflow-auto space-y-2">
                  {inactiveClients.map((c) => (
                    <div key={c.client_id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.client_name}</p>
                        {isAdmin && c.owner_email && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {emailToName[c.owner_email] || c.owner_email}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Fat. 12m: {fmtShort(c.revenue_12m)} · {fmtInt(c.orders_12m)} ped.
                        </p>
                      </div>
                      <div className="shrink-0 ml-2">
                        <Badge
                          variant={(c.days_since_last_purchase ?? 0) > 90 ? 'destructive' : 'secondary'}
                        >
                          {c.days_since_last_purchase}d
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop: table */}
                <div className="hidden sm:block max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        {isAdmin && <TableHead>Representante</TableHead>}
                        <TableHead className="text-right">Dias s/ compra</TableHead>
                        <TableHead className="text-right">Fat. 12m</TableHead>
                        <TableHead className="text-right">Pedidos</TableHead>
                        <TableHead className="text-right">Ticket</TableHead>
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
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Share de Loja */}
      <RepShareWidget />
    </div>
  );
}
