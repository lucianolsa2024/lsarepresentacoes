import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import {
  buildDailyDetail,
  fmtBRL,
  fmtBRLDetail,
  type CashflowFilters,
  type MonthBucket,
  type RecurringRevenue,
} from '@/hooks/useCashflowProjection';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: MonthBucket | null;
  prevAcumulado: number;
  recurring: RecurringRevenue[];
  filters: CashflowFilters;
};

export function MonthDrillDownDialog({ open, onOpenChange, bucket, prevAcumulado, recurring, filters }: Props) {
  const days = useMemo(() => {
    if (!bucket) return [];
    return buildDailyDetail(bucket, recurring, filters, prevAcumulado);
  }, [bucket, recurring, filters, prevAcumulado]);

  if (!bucket) return null;

  const sorted = [...bucket.entries].sort((a, b) => {
    const da = (a.status === 'pago' && a.paid_date) ? a.paid_date : a.due_date;
    const db = (b.status === 'pago' && b.paid_date) ? b.paid_date : b.due_date;
    return da.localeCompare(db);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Detalhamento — {bucket.label}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-4">
          <MiniKpi label="Entradas" value={fmtBRL(bucket.totalIn)} tone="success" />
          <MiniKpi label="Saídas" value={fmtBRL(bucket.totalOut)} tone="danger" />
          <MiniKpi label="Saldo do mês" value={fmtBRL(bucket.saldoMes)} tone={bucket.saldoMes >= 0 ? 'success' : 'danger'} />
          <MiniKpi label="Acumulado" value={fmtBRL(bucket.saldoAcumulado)} tone={bucket.saldoAcumulado >= 0 ? 'success' : 'danger'} />
        </div>

        <Tabs defaultValue="diario" className="mt-2">
          <TabsList>
            <TabsTrigger value="diario">Saldo diário</TabsTrigger>
            <TabsTrigger value="lancamentos">Lançamentos ({sorted.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="diario" className="space-y-3">
            <Card>
              <CardContent className="h-64 p-4">
                <ResponsiveContainer>
                  <ComposedChart data={days}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => fmtBRL(v as number)} tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v: number) => fmtBRLDetail(v)} />
                    <Bar dataKey="in" name="Entradas" fill="hsl(142 76% 45%)" />
                    <Bar dataKey="out" name="Saídas" fill="hsl(0 84% 60%)" />
                    <Line type="monotone" dataKey="saldoAcumulado" name="Acumulado" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="rounded-lg border border-border max-h-72 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Dia</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Saídas</TableHead>
                    <TableHead className="text-right">Saldo do dia</TableHead>
                    <TableHead className="text-right">Acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell className="font-medium">{d.label}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600">{fmtBRL(d.in)}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">{fmtBRL(d.out)}</TableCell>
                      <TableCell className={cn('text-right tabular-nums', d.saldo >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                        {fmtBRL(d.saldo)}
                      </TableCell>
                      <TableCell className={cn('text-right tabular-nums font-semibold', d.saldoAcumulado >= 0 ? 'text-emerald-700' : 'text-destructive')}>
                        {fmtBRL(d.saldoAcumulado)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="lancamentos">
            <div className="rounded-lg border border-border max-h-96 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((row) => {
                    const isPaid = row.status === 'pago' && row.paid_date;
                    const ref = isPaid ? row.paid_date! : row.due_date;
                    const isReceita = row.entry_type === 'a_receber';
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-sm">{new Date(ref + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="font-medium">{row.description}</TableCell>
                        <TableCell>
                          <Badge variant={isReceita ? 'default' : 'secondary'}>
                            {isReceita ? 'Receita' : 'Despesa'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'pago' ? 'default' : row.status === 'vencido' ? 'destructive' : 'outline'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn('text-right tabular-nums', isReceita ? 'text-emerald-600' : 'text-destructive')}>
                          {fmtBRLDetail(Number(row.amount))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {sorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        Nenhum lançamento neste mês.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MiniKpi({ label, value, tone }: { label: string; value: string; tone: 'success' | 'danger' }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-base font-bold', tone === 'success' ? 'text-emerald-600' : 'text-destructive')}>{value}</p>
      </CardContent>
    </Card>
  );
}
