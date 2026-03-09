import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Store, TrendingDown } from 'lucide-react';

const getShareColor = (share: number) => {
  if (share >= 50) return 'bg-green-600 text-white hover:bg-green-600';
  if (share >= 20) return 'bg-yellow-500 text-white hover:bg-yellow-500';
  return 'bg-red-600 text-white hover:bg-red-600';
};

interface ShareEntry {
  clientName: string;
  share: number;
  date: string;
}

export function RepShareWidget() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ShareEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    const load = async () => {
      setLoading(true);
      // Checklists may have assigned_to_email set OR may belong to the rep's clients
      const { data } = await supabase
        .from('activities')
        .select('description, due_date')
        .eq('type', 'checklist_loja')
        .not('description', 'is', null)
        .order('due_date', { ascending: false });

      const parsed: ShareEntry[] = [];
      const seenClients = new Set<string>();

      (data || []).forEach((a: any) => {
        try {
          const d = JSON.parse(a.description);
          const nossos = d.qtdProdutosNossos || 0;
          const concorrentes = d.qtdProdutosConcorrentes || 0;
          const total = nossos + concorrentes;
          if (total === 0) return;
          const clientName = d.cliente || 'Desconhecido';
          // Keep only latest per client
          if (seenClients.has(clientName)) return;
          seenClients.add(clientName);
          parsed.push({
            clientName,
            share: Math.round((nossos / total) * 100),
            date: d.dataVisita || a.due_date,
          });
        } catch { /* skip */ }
      });

      setEntries(parsed);
      setLoading(false);
    };
    load();
  }, [user?.email]);

  const avgShare = useMemo(() => {
    if (entries.length === 0) return null;
    return Math.round(entries.reduce((s, e) => s + e.share, 0) / entries.length);
  }, [entries]);

  const lowestShare = useMemo(() => {
    return entries.sort((a, b) => a.share - b.share).slice(0, 5);
  }, [entries]);

  if (loading || entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Store className="h-5 w-5" />
          Share de Loja
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {avgShare !== null && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Share médio da carteira:</span>
            <Badge className={getShareColor(avgShare)}>{avgShare}%</Badge>
            <span className="text-xs text-muted-foreground">({entries.length} lojas)</span>
          </div>
        )}

        {lowestShare.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
              <TrendingDown className="h-3.5 w-3.5" /> Oportunidades de melhoria
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowestShare.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{e.clientName}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={`text-xs ${getShareColor(e.share)}`}>{e.share}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
