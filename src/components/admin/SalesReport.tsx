import { useMemo, useState } from 'react';
import { normalizeSupplier } from '@/utils/supplierNormalize';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useSalesAnalyticsReport } from '@/hooks/useSalesAnalyticsReport';

const formatCurrency = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatInt = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR');

export function SalesReport() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));

  const { rows, summary, loading } = useSalesAnalyticsReport({ startDate, endDate });

  const bySupplier = useMemo(() => {
    const map: Record<string, { revenue: number; volume: number; orders: Set<string> }> = {};

    rows.forEach((row) => {
      const key = normalizeSupplier(row.supplier) || 'SEM FORNECEDOR';
      if (!map[key]) {
        map[key] = { revenue: 0, volume: 0, orders: new Set<string>() };
      }

      map[key].revenue += Number(row.line_revenue || 0);
      map[key].volume += Number(row.quantity || 0);
      if (row.id) map[key].orders.add(row.id);
    });

    return Object.entries(map)
      .map(([name, data]) => {
        const orders = data.orders.size;
        return {
          name,
          revenue: data.revenue,
          volume: data.volume,
          orders,
          ticket: orders > 0 ? data.revenue / orders : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [rows]);

  const byRep = useMemo(() => {
    const map: Record<string, { revenue: number; volume: number; orders: Set<string> }> = {};

    rows.forEach((row) => {
      const key = row.representative || row.owner_email || 'SEM REPRESENTANTE';
      if (!map[key]) {
        map[key] = { revenue: 0, volume: 0, orders: new Set<string>() };
      }

      map[key].revenue += Number(row.line_revenue || 0);
      map[key].volume += Number(row.quantity || 0);
      if (row.id) map[key].orders.add(row.id);
    });

    return Object.entries(map)
      .map(([name, data]) => {
        const orders = data.orders.size;
        return {
          name,
          revenue: data.revenue,
          volume: data.volume,
          orders,
          ticket: orders > 0 ? data.revenue / orders : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [rows]);

  const byClient = useMemo(() => {
    const map: Record<string, { revenue: number; volume: number; orders: Set<string> }> = {};

    rows.forEach((row) => {
      const key = row.client_name || 'SEM CLIENTE';
      if (!map[key]) {
        map[key] = { revenue: 0, volume: 0, orders: new Set<string>() };
      }

      map[key].revenue += Number(row.line_revenue || 0);
      map[key].volume += Number(row.quantity || 0);
      if (row.id) map[key].orders.add(row.id);
    });

    return Object.entries(map)
      .map(([name, data]) => {
        const orders = data.orders.size;
        return {
          name,
          revenue: data.revenue,
          volume: data.volume,
          orders,
          ticket: orders > 0 ? data.revenue / orders : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);
  }, [rows]);

  const crossData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    const suppliers = new Set<string>();

    rows.forEach((row) => {
      const rep = row.representative || row.owner_email || 'SEM REPRESENTANTE';
      const supplier = normalizeSupplier(row.supplier) || 'SEM FORNECEDOR';
      suppliers.add(supplier);

      if (!map[rep]) map[rep] = {};
      map[rep][supplier] = (map[rep][supplier] || 0) + Number(row.line_revenue || 0);
    });

    const supplierList = Array.from(suppliers).sort();

    return {
      suppliers: supplierList,
      rows: Object.entries(map)
        .map(([rep, values]) => ({ rep, ...values }))
        .sort((a, b) => a.rep.localeCompare(b.rep)),
    };
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros + resumo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtro de Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>De</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-44"
              />
            </div>

            <div>
              <Label>Até</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-44"
              />
            </div>

            <div className="space-x-3 text-sm text-muted-foreground">
              <span>{formatInt(summary.totalOrders)} pedidos</span>
              <span>
                Venda:{' '}
                <strong className="text-foreground">{formatCurrency(summary.vendaRevenue)}</strong>
              </span>
              <span>
                Faturado:{' '}
                <strong className="text-foreground">{formatCurrency(summary.faturadoRevenue)}</strong>
              </span>
              <span>
                Total:{' '}
                <strong className="text-foreground">{formatCurrency(summary.totalRevenue)}</strong>
              </span>
              <span>
                Ticket:{' '}
                <strong className="text-foreground">{formatCurrency(summary.avgTicket)}</strong>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico por representada */}
      {bySupplier.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Faturamento por Representada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySupplier} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`}
                  />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Faturamento" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela por representada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo por Representada</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Representada</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bySupplier.map((row) => (
                <TableRow key={row.name}>
                  <TableCell>
                    <Badge variant="outline">{row.name}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(row.revenue)}
                  </TableCell>
                  <TableCell className="text-right">{formatInt(row.volume)}</TableCell>
                  <TableCell className="text-right">{formatInt(row.orders)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.ticket)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Gráfico por representante */}
      {byRep.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Faturamento por Representante</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byRep} layout="vertical" margin={{ left: 110 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`}
                  />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Faturamento" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela por representante */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo por Representante</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Representante</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byRep.map((row) => (
                <TableRow key={row.name}>
                  <TableCell>
                    <Badge variant="outline">{row.name}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(row.revenue)}
                  </TableCell>
                  <TableCell className="text-right">{formatInt(row.volume)}</TableCell>
                  <TableCell className="text-right">{formatInt(row.orders)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.ticket)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabela por cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Clientes no Período</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byClient.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(row.revenue)}
                  </TableCell>
                  <TableCell className="text-right">{formatInt(row.volume)}</TableCell>
                  <TableCell className="text-right">{formatInt(row.orders)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.ticket)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cruzamento representante x representada */}
      {crossData.suppliers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cruzamento Representante × Representada</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Representante</TableHead>
                  {crossData.suppliers.map((supplier) => (
                    <TableHead key={supplier} className="text-right text-xs">
                      {supplier}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {crossData.rows.map((row: any) => (
                  <TableRow key={row.rep}>
                    <TableCell className="font-medium">{row.rep}</TableCell>
                    {crossData.suppliers.map((supplier) => (
                      <TableCell key={supplier} className="text-right text-xs">
                        {row[supplier] ? formatCurrency(row[supplier]) : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
