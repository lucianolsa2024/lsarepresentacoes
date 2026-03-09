import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, TrendingUp, Users, BarChart3 } from 'lucide-react';

interface ShareEntry {
  activityId: string;
  clientName: string;
  clientId: string | null;
  representante: string;
  ownerEmail: string | null;
  dataVisita: string;
  qtdNossos: number;
  qtdConcorrentes: number;
  totalProdutos: number;
  share: number;
}

const getShareColor = (share: number) => {
  if (share >= 50) return 'bg-green-600 text-white hover:bg-green-600';
  if (share >= 20) return 'bg-yellow-500 text-white hover:bg-yellow-500';
  return 'bg-red-600 text-white hover:bg-red-600';
};

export function ShareLojaReport() {
  const [entries, setEntries] = useState<ShareEntry[]>([]);
  const [reps, setReps] = useState<{ name: string; email: string }[]>([]);
  const [repFilter, setRepFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  useEffect(() => {
    const loadReps = async () => {
      const { data } = await supabase
        .from('representatives_map' as any)
        .select('representative_name, email')
        .eq('active', true);
      if (data) {
        setReps((data as any[]).map((r: any) => ({ name: r.representative_name, email: r.email })));
      }
    };
    loadReps();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [year, month] = monthFilter.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`;

      const { data: activities } = await supabase
        .from('activities')
        .select('id, description, client_id, assigned_to_email, due_date')
        .eq('type', 'checklist_loja')
        .not('description', 'is', null)
        .gte('due_date', startDate)
        .lt('due_date', endDate);

      const parsed: ShareEntry[] = [];
      (activities || []).forEach((a: any) => {
        try {
          const data = JSON.parse(a.description);
          const nossos = data.qtdProdutosNossos || 0;
          const concorrentes = data.qtdProdutosConcorrentes || 0;
          const total = nossos + concorrentes;
          if (total === 0) return;
          parsed.push({
            activityId: a.id,
            clientName: data.cliente || 'Desconhecido',
            clientId: a.client_id,
            representante: data.representante || '',
            ownerEmail: a.assigned_to_email,
            dataVisita: data.dataVisita || a.due_date,
            qtdNossos: nossos,
            qtdConcorrentes: concorrentes,
            totalProdutos: total,
            share: Math.round((nossos / total) * 100),
          });
        } catch { /* skip invalid */ }
      });

      setEntries(parsed);
      setLoading(false);
    };
    load();
  }, [monthFilter]);

  const filtered = useMemo(() => {
    let result = entries;
    if (repFilter !== 'all') {
      result = result.filter(e => e.ownerEmail === repFilter);
    }
    return result.sort((a, b) => a.share - b.share); // ascending to highlight lowest
  }, [entries, repFilter]);

  const avgShare = useMemo(() => {
    if (filtered.length === 0) return 0;
    return Math.round(filtered.reduce((s, e) => s + e.share, 0) / filtered.length);
  }, [filtered]);

  const uniqueStores = useMemo(() => {
    return new Set(filtered.map(e => e.clientName)).size;
  }, [filtered]);

  const monthLabel = useMemo(() => {
    const [y, m] = monthFilter.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [monthFilter]);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Período:</label>
          <Input
            type="month"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="w-48"
          />
        </div>
        <Select value={repFilter} onValueChange={setRepFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Todos os representantes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os representantes</SelectItem>
            {reps.map(r => (
              <SelectItem key={r.email} value={r.email}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground capitalize">{monthLabel}</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Share Médio Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge className={getShareColor(avgShare)}>{avgShare}%</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Store className="h-4 w-4" /> Lojas Visitadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueStores}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Checklists no Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filtered.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Share de Loja por Visita</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Representante</TableHead>
                <TableHead className="text-center">Data Visita</TableHead>
                <TableHead className="text-center">Total Produtos</TableHead>
                <TableHead className="text-center">Produtos Nossos</TableHead>
                <TableHead className="text-center">Share (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum checklist encontrado no período
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(e => (
                  <TableRow key={e.activityId}>
                    <TableCell className="font-medium">{e.clientName}</TableCell>
                    <TableCell>{e.representante}</TableCell>
                    <TableCell className="text-center">
                      {e.dataVisita ? new Date(e.dataVisita + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell className="text-center">{e.totalProdutos}</TableCell>
                    <TableCell className="text-center">{e.qtdNossos}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={getShareColor(e.share)}>{e.share}%</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
