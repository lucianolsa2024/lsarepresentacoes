import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Order } from '@/types/order';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

interface SalesReportProps {
  orders: Order[];
}

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function SalesReport({ orders }: SalesReportProps) {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));

  const filtered = useMemo(() => {
    if (!startDate || !endDate) return orders;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return orders.filter((o) => {
      const d = parseISO(o.issueDate);
      return isWithinInterval(d, { start, end });
    });
  }, [orders, startDate, endDate]);

  const bySupplier = useMemo(() => {
    const map: Record<string, { venda: number; faturado: number; volume: number; orders: number }> = {};
    filtered.forEach((o) => {
      const key = o.supplier || 'SEM FORNECEDOR';
      if (!map[key]) map[key] = { venda: 0, faturado: 0, volume: 0, orders: 0 };
      const val = o.price * o.quantity;
      if (o.status === 'faturado' || o.status === 'entregue') {
        map[key].faturado += val;
      } else {
        map[key].venda += val;
      }
      map[key].volume += o.quantity;
      map[key].orders += 1;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d, total: d.venda + d.faturado, ticket: d.orders ? (d.venda + d.faturado) / d.orders : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const byRep = useMemo(() => {
    const map: Record<string, { venda: number; faturado: number; volume: number; orders: number }> = {};
    filtered.forEach((o) => {
      const key = o.representative || 'SEM VENDEDOR';
      if (!map[key]) map[key] = { venda: 0, faturado: 0, volume: 0, orders: 0 };
      const val = o.price * o.quantity;
      if (o.status === 'faturado' || o.status === 'entregue') {
        map[key].faturado += val;
      } else {
        map[key].venda += val;
      }
      map[key].volume += o.quantity;
      map[key].orders += 1;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d, total: d.venda + d.faturado, ticket: d.orders ? (d.venda + d.faturado) / d.orders : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const crossData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    const suppliers = new Set<string>();
    filtered.forEach((o) => {
      const rep = o.representative || 'SEM VENDEDOR';
      const sup = o.supplier || 'SEM FORNECEDOR';
      suppliers.add(sup);
      if (!map[rep]) map[rep] = {};
      map[rep][sup] = (map[rep][sup] || 0) + o.price * o.quantity;
    });
    const supArr = Array.from(suppliers).sort();
    return { rows: Object.entries(map).map(([rep, sups]) => ({ rep, ...sups })).sort((a, b) => a.rep.localeCompare(b.rep)), suppliers: supArr };
  }, [filtered]);
  const totalVenda = filtered.filter(o => o.status !== 'faturado' && o.status !== 'entregue').reduce((s, o) => s + o.price * o.quantity, 0);
  const totalFaturado = filtered.filter(o => o.status === 'faturado' || o.status === 'entregue').reduce((s, o) => s + o.price * o.quantity, 0);
  const totalRevenue = totalVenda + totalFaturado;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtro de Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>De</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-44" />
            </div>
            <div>
              <Label>Até</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-44" />
            </div>
             <div className="text-sm text-muted-foreground space-x-3">
               <span>{filtered.length} pedidos</span>
               <span>Venda: <strong className="text-foreground">{formatCurrency(totalVenda)}</strong></span>
               <span>Faturado: <strong className="text-foreground">{formatCurrency(totalFaturado)}</strong></span>
               <span>Total: <strong className="text-foreground">{formatCurrency(totalRevenue)}</strong></span>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart by Supplier */}
      {bySupplier.length > 0 && (
        <Card>
           <CardHeader><CardTitle className="text-lg">Venda e Faturamento por Fornecedor</CardTitle></CardHeader>
           <CardContent>
             <div className="h-72">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={bySupplier} layout="vertical" margin={{ left: 80 }}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                   <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                   <Tooltip formatter={(v: number) => formatCurrency(v)} />
                   <Legend />
                   <Bar dataKey="venda" name="Venda" fill="hsl(var(--chart-2))" stackId="a" radius={[0, 0, 0, 0]} />
                   <Bar dataKey="faturado" name="Faturado" fill="hsl(var(--primary))" stackId="a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table by Supplier */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Resumo por Fornecedor</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
               <TableHead>Fornecedor</TableHead>
                 <TableHead className="text-right">Venda</TableHead>
                 <TableHead className="text-right">Faturado</TableHead>
                 <TableHead className="text-right">Total</TableHead>
                 <TableHead className="text-right">Volume</TableHead>
                 <TableHead className="text-right">Pedidos</TableHead>
                 <TableHead className="text-right">Ticket Médio</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {bySupplier.map((r) => (
                 <TableRow key={r.name}>
                   <TableCell><Badge variant="outline">{r.name}</Badge></TableCell>
                   <TableCell className="text-right">{formatCurrency(r.venda)}</TableCell>
                   <TableCell className="text-right">{formatCurrency(r.faturado)}</TableCell>
                   <TableCell className="text-right font-semibold">{formatCurrency(r.total)}</TableCell>
                  <TableCell className="text-right">{r.volume}</TableCell>
                  <TableCell className="text-right">{r.orders}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.ticket)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Chart by Rep */}
      {byRep.length > 0 && (
        <Card>
           <CardHeader><CardTitle className="text-lg">Venda e Faturamento por Vendedor</CardTitle></CardHeader>
           <CardContent>
             <div className="h-72">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={byRep} layout="vertical" margin={{ left: 100 }}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                   <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                   <Tooltip formatter={(v: number) => formatCurrency(v)} />
                   <Legend />
                   <Bar dataKey="venda" name="Venda" fill="hsl(var(--chart-2))" stackId="a" radius={[0, 0, 0, 0]} />
                   <Bar dataKey="faturado" name="Faturado" fill="hsl(var(--primary))" stackId="a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table by Rep */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Resumo por Vendedor</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byRep.map((r) => (
                <TableRow key={r.name}>
                  <TableCell><Badge variant="outline">{r.name}</Badge></TableCell>
                  <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
                  <TableCell className="text-right">{r.volume}</TableCell>
                  <TableCell className="text-right">{r.orders}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.ticket)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cross table */}
      {crossData.suppliers.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Cruzamento Vendedor × Fornecedor</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  {crossData.suppliers.map((s) => (
                    <TableHead key={s} className="text-right text-xs">{s}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {crossData.rows.map((row: any) => (
                  <TableRow key={row.rep}>
                    <TableCell className="font-medium">{row.rep}</TableCell>
                    {crossData.suppliers.map((s) => (
                      <TableCell key={s} className="text-right text-xs">
                        {row[s] ? formatCurrency(row[s]) : '-'}
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
