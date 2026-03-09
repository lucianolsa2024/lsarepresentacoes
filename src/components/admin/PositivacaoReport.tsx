import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';

interface RepPositivacao {
  name: string;
  email: string;
  totalClients: number;
  positivados: number;
  naoPositivados: number;
  pct: number;
}

export function PositivacaoReport() {
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [reps, setReps] = useState<{ name: string; email: string }[]>([]);
  const [clientsByRep, setClientsByRep] = useState<Record<string, string[]>>({});
  const [positivadosByRep, setPositivadosByRep] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);

  // Load reps once
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('representatives_map' as any)
        .select('representative_name, email')
        .eq('active', true);
      if (data) {
        setReps(
          (data as any[]).map((r: any) => ({
            name: r.representative_name,
            email: r.email,
          }))
        );
      }
    };
    load();
  }, []);

  // Load clients and orders for selected month
  useEffect(() => {
    if (reps.length === 0) return;
    const load = async () => {
      setLoading(true);
      const [year, month] = monthFilter.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`;

      const repEmails = reps.map(r => r.email);

      // Fetch all clients grouped by owner_email
      const { data: clients } = await supabase
        .from('clients')
        .select('id, owner_email')
        .in('owner_email', repEmails);

      const cByRep: Record<string, string[]> = {};
      (clients || []).forEach((c: any) => {
        if (!c.owner_email) return;
        if (!cByRep[c.owner_email]) cByRep[c.owner_email] = [];
        cByRep[c.owner_email].push(c.id);
      });
      setClientsByRep(cByRep);

      // Fetch orders in selected month with client_id
      const { data: orders } = await supabase
        .from('orders')
        .select('client_id, owner_email')
        .gte('issue_date', startDate)
        .lt('issue_date', endDate)
        .not('client_id', 'is', null);

      const pByRep: Record<string, Set<string>> = {};
      (orders || []).forEach((o: any) => {
        if (!o.owner_email || !o.client_id) return;
        if (!pByRep[o.owner_email]) pByRep[o.owner_email] = new Set();
        pByRep[o.owner_email].add(o.client_id);
      });
      setPositivadosByRep(pByRep);
      setLoading(false);
    };
    load();
  }, [reps, monthFilter]);

  const rows: RepPositivacao[] = useMemo(() => {
    return reps
      .map(r => {
        const total = (clientsByRep[r.email] || []).length;
        const posSet = positivadosByRep[r.email] || new Set();
        // Only count clients that are in the rep's portfolio
        const clientIds = clientsByRep[r.email] || [];
        const positivados = clientIds.filter(id => posSet.has(id)).length;
        const naoPositivados = total - positivados;
        const pct = total > 0 ? Math.round((positivados / total) * 100) : 0;
        return { name: r.name, email: r.email, totalClients: total, positivados, naoPositivados, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [reps, clientsByRep, positivadosByRep]);

  const totals = useMemo(() => {
    const totalClients = rows.reduce((s, r) => s + r.totalClients, 0);
    const totalPositivados = rows.reduce((s, r) => s + r.positivados, 0);
    const pct = totalClients > 0 ? Math.round((totalPositivados / totalClients) * 100) : 0;
    return { totalClients, totalPositivados, naoPositivados: totalClients - totalPositivados, pct };
  }, [rows]);

  const monthLabel = useMemo(() => {
    const [y, m] = monthFilter.split('-').map(Number);
    const d = new Date(y, m - 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [monthFilter]);

  const getPctColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600';
    if (pct < 50) return 'text-red-600';
    return 'text-foreground';
  };

  const getBadgeVariant = (pct: number): 'default' | 'destructive' | 'secondary' => {
    if (pct >= 80) return 'default';
    if (pct < 50) return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-muted-foreground">Mês/Ano:</label>
        <Input
          type="month"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          className="w-48"
        />
        <span className="text-sm text-muted-foreground capitalize">{monthLabel}</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Positivação Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.pct}%</div>
            <Progress value={totals.pct} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Total Carteira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalClients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Positivados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totals.totalPositivados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserX className="h-4 w-4" /> Não Positivados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totals.naoPositivados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Positivação por Representante</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Representante</TableHead>
                  <TableHead className="text-center">Carteira</TableHead>
                  <TableHead className="text-center">Positivados</TableHead>
                  <TableHead className="text-center">Não Positivados</TableHead>
                  <TableHead className="text-center">% Positivação</TableHead>
                  <TableHead className="w-40">Progresso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.email}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-center">{r.totalClients}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">{r.positivados}</TableCell>
                    <TableCell className="text-center text-red-600 font-medium">{r.naoPositivados}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getBadgeVariant(r.pct)} className={getPctColor(r.pct)}>
                        {r.pct}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Progress value={r.pct} className="h-2" />
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum dado encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
